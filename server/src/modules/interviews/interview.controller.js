const Interview = require('./interview.model');
const Question = require('../questions/question.model');
const User = require('../auth/auth.model');
const ViolationLog = require('../monitoring/violation.model');
const Submission = require('../coding/submission.model');
const InterviewReport = require('./report.model');
const Answer = require('./answer.model');
const SystemDesign = require('./systemDesign.model');
const { sendSuccess, sendError } = require('../../shared/utils/response.utils');
const {
  normalizeStatus,
  isActiveStatus,
  isTerminalStatus,
  canJoinInterview,
  canEnterLiveRoom,
  assertTransition
} = require('./interview.status');
const crypto = require('crypto');
const path = require('path');

const AI_SERVICE_URL = process.env.AI_MONITORING_URL || 'http://localhost:5050';

const MOCK_MODE_CONFIG = {
  DSA: {
    role: 'Software Engineer (DSA round)',
    skills: ['DSA', 'Algorithms', 'Data Structures', 'Arrays', 'Strings', 'Trees', 'Graphs', 'Dynamic Programming'],
    type: 'CODING',
    interviewType: 'CODING'
  },
  CORE_CS: {
    role: 'Computer Science fundamentals company',
    skills: ['DBMS', 'Operating Systems', 'Computer Networks', 'OOP', 'Computer Architecture', 'Deadlocks', 'Indexing', 'TCP/IP'],
    type: 'TEXT',
    interviewType: 'TECHNICAL'
  },
  PROJECT: {
    role: 'Software Engineer discussing shipped projects',
    skills: ['System design of personal projects', 'APIs', 'databases', 'frontend', 'backend'],
    type: 'TEXT',
    interviewType: 'TECHNICAL'
  },
  MIXED: {
    role: 'Software Engineer mixed technical round',
    skills: ['DSA', 'DBMS', 'Operating Systems', 'Computer Networks', 'OOP', 'Project implementation'],
    type: 'TEXT',
    interviewType: 'MIXED'
  }
};

const fallbackQuestionsForMode = (mode) => {
  if (mode === 'DSA') {
    return [{
      type: 'CODING',
      prompt: 'Given an array of integers, return indices of the two numbers that add up to a target. Assume exactly one solution exists.',
      topic: 'Arrays / Hashing',
      difficulty: 'MEDIUM',
      expectedKeywords: ['hash map', 'two sum', 'O(n)'],
      constraints: ['2 <= nums.length <= 10^4'],
      examples: [{ input: 'nums = [2,7,11,15], target = 9', output: '[0,1]' }],
      testCases: [{ input: '2 7 11 15\n9', expectedOutput: '0 1' }]
    }];
  }
  if (mode === 'CORE_CS') {
    return [
      { type: 'TEXT', prompt: 'Explain how a B+ tree index differs from a hash index in a DBMS and when you would choose each.', topic: 'DBMS', difficulty: 'MEDIUM', expectedKeywords: ['B+ tree', 'range query', 'hash index'] },
      { type: 'TEXT', prompt: 'What is a deadlock? Describe the four Coffman conditions and one prevention strategy.', topic: 'Operating Systems', difficulty: 'MEDIUM', expectedKeywords: ['deadlock', 'mutual exclusion', 'hold and wait'] },
      { type: 'TEXT', prompt: 'Walk through TCP three-way handshake and what happens if the ACK is lost.', topic: 'Computer Networks', difficulty: 'MEDIUM', expectedKeywords: ['SYN', 'SYN-ACK', 'ACK'] }
    ];
  }
  if (mode === 'PROJECT') {
    return [{
      type: 'TEXT',
      prompt: 'Describe a project you built: architecture, the hardest bug you fixed, and one scaling improvement you would make next.',
      topic: 'Projects',
      difficulty: 'MEDIUM',
      expectedKeywords: ['architecture', 'trade-off', 'bottleneck']
    }];
  }
  return [
    { type: 'CODING', prompt: 'Reverse a linked list iteratively and explain the pointer updates.', topic: 'DSA', difficulty: 'EASY', expectedKeywords: ['prev', 'curr', 'next'] },
    { type: 'TEXT', prompt: 'Compare processes and threads. When would you use multithreading vs multiprocessing?', topic: 'Operating Systems', difficulty: 'MEDIUM', expectedKeywords: ['shared memory', 'context switch'] },
    { type: 'TEXT', prompt: 'Pick one project and explain how you persisted data and handled failures.', topic: 'Projects', difficulty: 'MEDIUM', expectedKeywords: ['database', 'idempotency'] }
  ];
};

const persistGeneratedQuestions = async ({ interviewId, userId, questions }) => {
  const lastQuestion = await Question.findOne({ interview: interviewId }).sort({ order: -1 }).select('order').lean();
  let nextOrder = (lastQuestion?.order || 0) + 1;
  const docs = (questions || []).filter((q) => q?.prompt).map((q) => ({
    interview: interviewId,
    createdBy: userId,
    source: 'AI',
    type: q.type || 'TEXT',
    prompt: q.prompt || q.question,
    topic: q.topic || 'General',
    difficulty: q.difficulty || 'MEDIUM',
    order: nextOrder++,
    expectedKeywords: q.expectedKeywords || [],
    constraints: q.constraints || [],
    examples: q.examples || [],
    testCases: q.testCases || [],
    options: q.options,
    correctOptionIndex: q.correctOptionIndex
  }));
  if (!docs.length) return [];
  return Question.insertMany(docs);
};

const generateQuestionsFromAi = async ({ mode, numberOfQuestions, skills, role, type }) => {
  const config = MOCK_MODE_CONFIG[mode] || MOCK_MODE_CONFIG.MIXED;
  const aiResponse = await fetch(`${AI_SERVICE_URL}/api/ai/generate-questions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      role: role || config.role,
      skills: (skills && skills.length ? skills : config.skills),
      type: type || config.type,
      difficulty: 'MEDIUM',
      numberOfQuestions: numberOfQuestions || 3,
      mode
    })
  });
  const aiResult = await aiResponse.json();
  if (!aiResponse.ok || !aiResult.success || !Array.isArray(aiResult.data?.questions)) {
    throw new Error(aiResult.message || 'AI question generation failed');
  }
  return aiResult.data.questions;
};

/**
 * Helper to generate random 6-character room code (e.g. INT-8X9Y)
 */
const generateRoomCode = () => {
  return 'INT-' + crypto.randomBytes(3).toString('hex').toUpperCase();
};

/**
 * @desc    Create a new Interview Room (Company only)
 * @route   POST /api/interviews
 * @access  Private (Company)
 */
const createInterview = async (req, res) => {
  try {
    const { title, description, interviewType, durationMinutes, settings, question } = req.body;

    if (!title) {
      return sendError(res, 400, 'Interview title is required');
    }

    const roomCode = generateRoomCode();

    const interview = await Interview.create({
      title,
      description,
      roomCode,
      createdBy: req.user._id,
      interviewType: interviewType || 'TECHNICAL',
      durationMinutes: durationMinutes || 60,
      status: 'CREATED',
      participants: [
        {
          user: req.user._id,
          role: 'COMPANY',
          inviteStatus: 'JOINED'
        }
      ],
      settings: settings || {}
    });

    let createdQuestion = null;
    if (question?.prompt?.trim()) {
      createdQuestion = await Question.create({
        interview: interview._id,
        createdBy: req.user._id,
        source: question.source || 'MANUAL',
        type: question.type || (interviewType === 'CODING' ? 'CODING' : 'TEXT'),
        prompt: question.prompt.trim(),
        topic: question.topic || 'Algorithms',
        difficulty: question.difficulty || 'MEDIUM',
        order: 1,
        expectedKeywords: question.expectedKeywords || [],
        constraints: question.constraints || [],
        examples: question.examples || [],
        testCases: question.testCases || []
      });
    }

    return sendSuccess(res, 201, 'Interview room created successfully', {
      interview,
      question: createdQuestion
    });
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

/**
 * @desc    Create an AI Mock Interview (Student)
 * @route   POST /api/interviews/mock
 * @access  Private (Any authenticated user)
 */
const createMockInterview = async (req, res) => {
  try {
    const requestedMode = String(req.body.mode || 'MIXED').toUpperCase();
    const mode = MOCK_MODE_CONFIG[requestedMode] ? requestedMode : 'MIXED';
    const numberOfQuestions = Math.min(Math.max(Number(req.body.numberOfQuestions) || 3, 1), 8);
    const roomCode = generateRoomCode();
    const title = `AI Mock Interview (${mode}) - ` + new Date().toLocaleDateString();
    const config = MOCK_MODE_CONFIG[mode];

    const interview = await Interview.create({
      title,
      description: `Auto-generated mock interview in ${mode} mode.`,
      roomCode,
      createdBy: req.user._id,
      interviewType: config.interviewType,
      mockMode: mode,
      durationMinutes: 60,
      participants: [
        {
          user: req.user._id,
          role: req.user.accountRole === 'COMPANY' ? 'COMPANY' : 'STUDENT',
          inviteStatus: 'JOINED'
        }
      ],
      status: 'ACTIVE',
      startedAt: new Date()
    });

    let questions = [];
    let generationError = null;
    try {
      const resumeSkills = Array.isArray(req.body.skills) ? req.body.skills : [];
      questions = await generateQuestionsFromAi({
        mode,
        numberOfQuestions,
        skills: resumeSkills,
        role: req.body.role,
        type: req.body.type || config.type
      });
    } catch (err) {
      generationError = err.message;
      console.error('[Mock Interview] AI generation failed:', err.message);
      questions = fallbackQuestionsForMode(mode).slice(0, numberOfQuestions);
    }

    const saved = await persistGeneratedQuestions({
      interviewId: interview._id,
      userId: req.user._id,
      questions
    });

    return sendSuccess(res, 201, generationError
      ? 'Mock interview created with fallback questions because AI generation failed.'
      : 'Mock interview created successfully', {
      interview,
      questions: saved,
      mockMode: mode,
      aiGenerationFailed: Boolean(generationError),
      aiError: generationError
    });
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

const createP2PInterview = async (req, res) => {
  try {
    const { topic, durationMinutes } = req.body;
    const roomCode = generateRoomCode();
    const title = `P2P Mock: ${topic || 'Practice'} - ` + new Date().toLocaleDateString();
    
    const interview = await Interview.create({
      title,
      description: 'Peer-to-peer practice mock interview.',
      roomCode,
      createdBy: req.user._id,
      interviewType: 'TECHNICAL',
      durationMinutes: durationMinutes || 45,
      participants: [
        {
          user: req.user._id,
          role: req.user.accountRole === 'COMPANY' ? 'COMPANY' : 'STUDENT',
          inviteStatus: 'JOINED',
          joinedAt: new Date()
        }
      ],
      status: 'ACTIVE',
      startedAt: new Date()
    });

    return sendSuccess(res, 201, 'P2P practice room created successfully', { interview });
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

/**
 * @desc    Get all interviews for the logged-in user
 * @route   GET /api/interviews
 * @access  Private
 */
const getInterviews = async (req, res) => {
  try {
    const interviews = await Interview.find({
      $or: [
        { createdBy: req.user._id },
        { 'participants.user': req.user._id }
      ]
    })
      .populate('createdBy', 'fullName email avatarUrl')
      .populate('participants.user', 'fullName email avatarUrl accountRole')
      .sort({ createdAt: -1 });

    return sendSuccess(res, 200, 'Interviews retrieved successfully', {
      count: interviews.length,
      interviews
    });
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

/**
 * @desc    Get Interview details by ID
 * @route   GET /api/interviews/:id
 * @access  Private
 */
const getInterviewById = async (req, res) => {
  try {
    const interview = await Interview.findById(req.params.id)
      .populate('createdBy', 'fullName email avatarUrl')
      .populate('participants.user', 'fullName email avatarUrl accountRole');

    if (!interview) {
      return sendError(res, 404, 'Interview room not found');
    }

    const isOwner = String(interview.createdBy?._id || interview.createdBy) === String(req.user._id);
    const isParticipant = (interview.participants || []).some((p) => String(p.user?._id || p.user) === String(req.user._id));
    if (!isOwner && !isParticipant && req.user.accountRole !== 'ADMIN') {
      return sendError(res, 403, 'You are not authorized to view this interview.');
    }

    return sendSuccess(res, 200, 'Interview details retrieved', { interview });
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

/**
 * @desc    Preview Interview via Room Code without joining
 * @route   GET /api/interviews/room/:roomCode
 * @access  Private
 */
const getInterviewByRoomCode = async (req, res) => {
  try {
    const roomCode = String(req.params.roomCode || '').trim().toUpperCase();
    if (!roomCode) return sendError(res, 400, 'Room code is required');

    const interview = await Interview.findOne({ roomCode })
      .select('title description roomCode interviewType durationMinutes settings status createdBy participants startedAt')
      .populate('createdBy', 'fullName email')
      .lean();

    if (!interview) {
      return sendError(res, 404, 'No interview room found with this code');
    }

    return sendSuccess(res, 200, 'Interview preview loaded', { interview });
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

/**
 * @desc    Join Interview via Room Code
 * @route   POST /api/interviews/join
 * @access  Private
 */
const joinInterviewByCode = async (req, res) => {
  try {
    const { roomCode } = req.body;

    if (!roomCode) {
      return sendError(res, 400, 'Please provide a valid room code');
    }

    const interview = await Interview.findOne({ roomCode: roomCode.toUpperCase() });

    if (!interview) {
      return sendError(res, 404, 'No active interview room found with this code');
    }

    // Check if the student is already in participants
    const alreadyParticipant = interview.participants.find(
      (p) => p.user.toString() === req.user._id.toString()
    );
    const isOwner = String(interview.createdBy) === String(req.user._id);
    if (req.user.accountRole === 'COMPANY' && !isOwner && !alreadyParticipant) {
      return sendError(res, 403, 'Only the company that owns this interview can join as a company participant.');
    }
    if (req.user.accountRole === 'ADMIN' && !alreadyParticipant && !isOwner) {
      return sendError(res, 403, 'Admin accounts can inspect interviews but do not join live sessions as participants.');
    }

    if (isTerminalStatus(interview.status)) {
      return sendError(res, 409, `Interview is ${normalizeStatus(interview.status).toLowerCase()} and can no longer be joined.`);
    }

    if (!canJoinInterview(interview.status)) {
      return sendError(res, 409, `Interview is ${interview.status.toLowerCase()}.`);
    }

    if (!alreadyParticipant) {
      const participantRole = req.user.accountRole === 'COMPANY' || req.user.accountRole === 'ADMIN'
        ? 'COMPANY'
        : 'STUDENT';
      interview.participants.push({
        user: req.user._id,
        role: participantRole,
        inviteStatus: 'JOINED',
        joinedAt: new Date()
      });
    }

    if (req.user.accountRole === 'STUDENT' && normalizeStatus(interview.status) === 'CREATED') {
      assertTransition(interview.status, 'WAITING');
      interview.status = 'WAITING';
    }

    await interview.save();

    return sendSuccess(res, 200, 'Successfully joined interview room', {
      interview,
      canEnterRoom: canEnterLiveRoom(interview.status)
    });
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};


/**
 * Start a scheduled interview. Only the company who created it can start it.
 * POST /api/interviews/:id/start
 */
const startInterview = async (req, res) => {
  try {
    const interview = await Interview.findOne({
      _id: req.params.id,
      $or: [{ createdBy: req.user._id }, { 'participants.user': req.user._id }]
    });
    if (!interview) return sendError(res, 404, 'Interview not found');
    const isOwner = String(interview.createdBy) === String(req.user._id);
    const isCompany = req.user.accountRole === 'COMPANY';
    const isAdmin = req.user.accountRole === 'ADMIN';
    if ((!isOwner && !isCompany && !isAdmin) || (isCompany && !isOwner)) return sendError(res, 403, 'Only the owning company or an admin can start this interview.');
    if (isActiveStatus(interview.status)) return sendSuccess(res, 200, 'Interview is already live', { interview });
    try {
      assertTransition(interview.status, 'ACTIVE');
    } catch (err) {
      return sendError(res, err.statusCode || 400, err.message);
    }

    interview.status = 'ACTIVE';
    interview.startedAt = new Date();
    await interview.save();

    const io = req.app.get('io');
    if (io && interview.roomCode) {
      io.to(interview.roomCode).emit('interview:status', { status: 'ACTIVE', interviewId: interview._id });
    }

    return sendSuccess(res, 200, 'Interview started', { interview });
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

/**
 * Complete a live interview. Only its company can complete it.
 * POST /api/interviews/:id/complete
 */
const completeInterview = async (req, res) => {
  try {
    const interview = await Interview.findOne({
      _id: req.params.id,
      $or: [{ createdBy: req.user._id }, { 'participants.user': req.user._id }]
    });
    if (!interview) return sendError(res, 404, 'Interview not found');
    const isOwner = String(interview.createdBy) === String(req.user._id);
    const isCompany = req.user.accountRole === 'COMPANY';
    const isAdmin = req.user.accountRole === 'ADMIN';
    if ((!isOwner && !isCompany && !isAdmin) || (isCompany && !isOwner)) return sendError(res, 403, 'Only the owning company or an admin can complete this interview.');
    if (normalizeStatus(interview.status) === 'COMPLETED') return sendSuccess(res, 200, 'Interview already completed', { interview });
    try {
      assertTransition(interview.status, 'COMPLETED');
    } catch (err) {
      return sendError(res, err.statusCode || 400, err.message);
    }

    interview.status = 'COMPLETED';
    interview.completedAt = new Date();
    await interview.save();

    let report = null;
    try {
      req.params.id = String(interview._id);
      report = await buildAndSaveReport(interview, req.user);
    } catch (err) {
      console.error('[Interview Complete] Report generation failed:', err.message);
    }

    return sendSuccess(res, 200, 'Interview completed', { interview, report });
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

const cancelInterview = async (req, res) => {
  try {
    const interview = await Interview.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!interview) return sendError(res, 404, 'Interview not found');
    try {
      assertTransition(interview.status, 'CANCELLED');
    } catch (err) {
      return sendError(res, err.statusCode || 400, err.message);
    }
    interview.status = 'CANCELLED';
    await interview.save();
    return sendSuccess(res, 200, 'Interview cancelled', { interview });
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

/**
 * Dashboard summary for the authenticated user. All values are derived from MongoDB;
 * no demo/fallback counts are returned.
 */
const getDashboardSummary = async (req, res) => {
  try {
    const interviews = await Interview.find({
      $or: [{ createdBy: req.user._id }, { 'participants.user': req.user._id }]
    }).select('_id status participants createdBy').lean();

    const owned = interviews.filter((x) => String(x.createdBy) === String(req.user._id));
    const studentIds = new Set();
    owned.forEach((interview) => {
      (interview.participants || []).forEach((participant) => {
        if (participant.role === 'STUDENT') studentIds.add(String(participant.user));
      });
    });

    const violations = owned.length
      ? await ViolationLog.find({ interviewId: { $in: owned.map((x) => x._id) } }).select('interviewId studentId').lean()
      : [];

    const activeAlerts = violations.length;
    const completed = owned.filter((x) => x.status === 'COMPLETED').length;
    const live = owned.filter((x) => isActiveStatus(x.status)).length;
    const total = owned.length;
    const scheduled = owned.filter((x) => ['CREATED', 'WAITING', 'SCHEDULED', 'DRAFT'].includes(normalizeStatus(x.status)) || x.status === 'SCHEDULED' || x.status === 'DRAFT' || x.status === 'CREATED' || x.status === 'WAITING').length;

    return sendSuccess(res, 200, 'Dashboard summary retrieved', {
      summary: {
        totalInterviews: total,
        completedInterviews: completed,
        ongoingInterviews: live,
        scheduledInterviews: scheduled,
        totalStudents: studentIds.size,
        totalViolations: activeAlerts
      }
    });
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

const getStudents = async (req, res) => {
  try {
    const interviews = await Interview.find({ createdBy: req.user._id })
      .select('_id participants')
      .lean();
    const ids = new Set();
    interviews.forEach((interview) => {
      (interview.participants || []).forEach((participant) => {
        if (participant.role === 'STUDENT') ids.add(String(participant.user));
      });
    });
    const users = ids.size ? await User.find({ _id: { $in: [...ids] }, accountRole: 'STUDENT' })
      .select('fullName email avatarUrl isActive')
      .lean() : [];
    const rows = users.map((user) => ({
      ...user,
      interviewCount: interviews.reduce((count, interview) => count + ((interview.participants || []).some((p) => p.role === 'STUDENT' && String(p.user) === String(user._id)) ? 1 : 0), 0)
    }));
    return sendSuccess(res, 200, 'Students retrieved', { count: rows.length, students: rows });
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

const getAnalytics = async (req, res) => {
  try {
    const interviews = await Interview.find({ createdBy: req.user._id }).select('_id title status participants').lean();
    const interviewIds = interviews.map((x) => x._id);
    if (!interviewIds.length) {
      return sendSuccess(res, 200, 'Analytics retrieved', {
        analytics: { totalInterviews: 0, completed: 0, students: 0, violations: 0, submissions: 0, averageScore: null, recentOutcomes: [] }
      });
    }
    const [submissions, violations, reports] = await Promise.all([
      Submission.find({ interviewId: { $in: interviewIds } }).populate('studentId', 'fullName email').sort({ submittedAt: -1 }).lean(),
      ViolationLog.find({ interviewId: { $in: interviewIds } }).populate('studentId', 'fullName email').sort({ timestamp: -1 }).lean(),
      InterviewReport.find({ interviewId: { $in: interviewIds } }).lean()
    ]);
    const scores = submissions.map((x) => Number(x.score)).filter((x) => Number.isFinite(x));
    const studentIds = new Set();
    interviews.forEach((i) => (i.participants || []).forEach((p) => { if (p.role === 'STUDENT') studentIds.add(String(p.user)); }));
    const byStudent = new Map();
    submissions.forEach((s) => {
      const key = String(s.studentId?._id || s.studentId);
      const prev = byStudent.get(key) || { student: s.studentId?.fullName || 'Unknown student', email: s.studentId?.email || '', submissions: 0, scoreTotal: 0, violations: 0 };
      prev.submissions += 1; prev.scoreTotal += Number(s.score) || 0; byStudent.set(key, prev);
    });
    violations.forEach((v) => {
      const key = String(v.studentId?._id || v.studentId);
      const prev = byStudent.get(key) || { student: v.studentId?.fullName || 'Unknown student', email: v.studentId?.email || '', submissions: 0, scoreTotal: 0, violations: 0 };
      prev.violations += 1; byStudent.set(key, prev);
    });
    const recentOutcomes = [...byStudent.values()].map((x) => ({ ...x, averageScore: x.submissions ? Math.round(x.scoreTotal / x.submissions) : null }));
    return sendSuccess(res, 200, 'Analytics retrieved', {
      analytics: {
        totalInterviews: interviews.length,
        completed: interviews.filter((x) => x.status === 'COMPLETED').length,
        students: studentIds.size,
        violations: violations.length,
        submissions: submissions.length,
        averageScore: scores.length ? Math.round(scores.reduce((a,b)=>a+b,0)/scores.length) : null,
        averageOverallScore: reports.length ? Math.round(reports.reduce((a,r)=>a+(r.overallScore||0),0)/reports.length) : null,
        reportsGenerated: reports.length,
        recentOutcomes
      }
    });
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};



const recordAdaptiveTurn = async (req, res) => {
  try {
    const { question, studentAnswer, candidateAnswer, technicalScore, communicationScore, summary } = req.body;
    const answerText = String(candidateAnswer || studentAnswer || '');
    const interview = await Interview.findById(req.params.id);
    if (!interview) return sendError(res, 404, 'Interview not found');
    const participant = interview.participants.some((p) => String(p.user) === String(req.user._id));
    const owner = String(interview.createdBy) === String(req.user._id);
    if (!participant && !owner) return sendError(res, 403, 'You are not a participant in this interview');
    interview.adaptiveTurns.push({ question, candidateAnswer: answerText, technicalScore, communicationScore, summary });
    await interview.save();
    return sendSuccess(res, 201, 'Adaptive interview turn saved', { turn: interview.adaptiveTurns[interview.adaptiveTurns.length - 1] });
  } catch (error) { return sendError(res, 500, error.message); }
};

const textSubmit = async (req, res) => {
  try {
    const { question, questionId, studentAnswer, candidateAnswer, expectedKeywords, type, difficulty } = req.body;
    const answerText = String(studentAnswer || candidateAnswer || '').trim();
    if (!answerText) return sendError(res, 400, 'Answer text is required');

    const interview = await Interview.findById(req.params.id);
    if (!interview) return sendError(res, 404, 'Interview not found');
    const participant = interview.participants.some((p) => String(p.user) === String(req.user._id));
    const owner = String(interview.createdBy) === String(req.user._id);
    if (!participant && !owner) return sendError(res, 403, 'You are not a participant in this interview');

    const answerDoc = await Answer.create({
      interview: interview._id,
      question: questionId || null,
      participant: req.user._id,
      answer: answerText,
      evaluationStatus: 'PENDING',
      summary: 'Answer saved. AI evaluation is running.'
    });

    interview.adaptiveTurns.push({
      question,
      candidateAnswer: answerText,
      technicalScore: 0,
      communicationScore: 0,
      summary: 'Answer saved. AI evaluation is running.'
    });
    await interview.save();
    const turnIndex = interview.adaptiveTurns.length - 1;

    sendSuccess(res, 201, 'Answer saved. AI evaluation is running.', {
      answerId: answerDoc._id,
      answerSaved: true,
      evaluationStatus: 'PENDING',
      evaluation: {
        technicalScore: 0,
        communicationScore: 0,
        summary: 'Answer saved. AI evaluation is running.',
        evaluationStatus: 'PENDING'
      }
    });

    setImmediate(async () => {
      try {
        const aiResponse = await fetch(`${AI_SERVICE_URL}/api/ai/interview-assistant`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            currentQuestion: question,
            candidateAnswer: answerText,
            expectedKeywords: expectedKeywords || [],
            interviewType: type || 'TEXT',
            difficulty: difficulty || 'MEDIUM',
            previousTurns: []
          })
        });
        const aiResult = await aiResponse.json();
        const evaluation = aiResult.data?.evaluation;
        if (aiResponse.ok && evaluation) {
          answerDoc.evaluationStatus = 'COMPLETED';
          answerDoc.technicalScore = evaluation.technicalScore || 0;
          answerDoc.communicationScore = evaluation.communicationScore || 0;
          answerDoc.summary = evaluation.summary || 'Evaluated';
          await answerDoc.save();
          interview.adaptiveTurns[turnIndex].technicalScore = answerDoc.technicalScore;
          interview.adaptiveTurns[turnIndex].communicationScore = answerDoc.communicationScore;
          interview.adaptiveTurns[turnIndex].summary = answerDoc.summary;
          await interview.save();
        } else {
          answerDoc.evaluationStatus = 'FAILED';
          answerDoc.summary = aiResult.message || 'AI evaluation is temporarily unavailable.';
          await answerDoc.save();
        }
      } catch (err) {
        console.error('[Answer Evaluation] failed:', err.message);
        answerDoc.evaluationStatus = 'FAILED';
        answerDoc.summary = 'AI evaluation is temporarily unavailable. Your answer was saved.';
        await answerDoc.save();
      }

      const io = req.app.get('io');
      if (io) {
        io.to(String(interview._id)).emit('answer:evaluated', {
          answerId: answerDoc._id,
          interviewId: interview._id,
          evaluationStatus: answerDoc.evaluationStatus,
          evaluation: {
            technicalScore: answerDoc.technicalScore,
            communicationScore: answerDoc.communicationScore,
            summary: answerDoc.summary,
            evaluationStatus: answerDoc.evaluationStatus
          }
        });
        if (interview.roomCode) {
          io.to(interview.roomCode).emit('answer:evaluated', {
            answerId: answerDoc._id,
            interviewId: interview._id,
            evaluationStatus: answerDoc.evaluationStatus,
            evaluation: {
              technicalScore: answerDoc.technicalScore,
              communicationScore: answerDoc.communicationScore,
              summary: answerDoc.summary,
              evaluationStatus: answerDoc.evaluationStatus
            }
          });
        }
      }
    });
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

const getAnswers = async (req, res) => {
  try {
    const interview = await Interview.findById(req.params.id).select('createdBy participants').lean();
    if (!interview) return sendError(res, 404, 'Interview not found');
    const allowed = String(interview.createdBy) === String(req.user._id)
      || (interview.participants || []).some((p) => String(p.user) === String(req.user._id))
      || req.user.accountRole === 'ADMIN';
    if (!allowed) return sendError(res, 403, 'You are not allowed to view these answers');
    const filter = { interview: req.params.id };
    if (req.user.accountRole === 'STUDENT') filter.participant = req.user._id;
    const answers = await Answer.find(filter).sort({ submittedAt: 1 }).lean();
    return sendSuccess(res, 200, 'Answers retrieved', { answers });
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

const getAnswerById = async (req, res) => {
  try {
    const answer = await Answer.findOne({ _id: req.params.answerId, interview: req.params.id }).lean();
    if (!answer) return sendError(res, 404, 'Answer not found');
    const allowed = String(answer.participant) === String(req.user._id) || req.user.accountRole === 'COMPANY' || req.user.accountRole === 'ADMIN';
    if (!allowed) return sendError(res, 403, 'You are not allowed to view this answer');
    return sendSuccess(res, 200, 'Answer retrieved', { answer });
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

const updateNotes = async (req, res) => {
  try {
    const interview = await Interview.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!interview) return sendError(res, 404, 'Interview not found');
    interview.companyNotes = String(req.body.notes || '').slice(0, 10000);
    await interview.save();
    return sendSuccess(res, 200, 'Company notes saved', { notes: interview.companyNotes });
  } catch (error) { return sendError(res, 500, error.message); }
};

const saveResumeProfile = async (req, res) => {
  try {
    const interview = await Interview.findOne({ _id: req.params.id, $or: [{ createdBy: req.user._id }, { 'participants.user': req.user._id }] });
    if (!interview) return sendError(res, 404, 'Interview not found');
    const text = String(req.body.text || '').slice(0, 30000);
    const skills = Array.isArray(req.body.skills) ? req.body.skills.slice(0, 50) : [];
    const projects = Array.isArray(req.body.projects) ? req.body.projects.slice(0, 30) : [];
    interview.studentResume = { fileName: req.body.fileName || 'resume.txt', text, skills, projects, uploadedAt: new Date() };
    await interview.save();
    return sendSuccess(res, 200, 'Resume profile saved', { resume: interview.studentResume });
  } catch (error) { return sendError(res, 500, error.message); }
};

const getReport = async (req, res) => {
  try {
    const interview = await Interview.findById(req.params.id).select('createdBy participants title status durationMinutes startedAt completedAt companyNotes studentResume adaptiveTurns').lean();
    if (!interview) return sendError(res, 404, 'Interview not found');
    const allowed = String(interview.createdBy) === String(req.user._id)
      || (interview.participants || []).some((p) => String(p.user) === String(req.user._id))
      || req.user.accountRole === 'ADMIN';
    if (!allowed) return sendError(res, 403, 'You are not allowed to view this report');
    const report = await InterviewReport.findOne({ interviewId: req.params.id }).lean();
    if (String(interview.createdBy) !== String(req.user._id)) delete interview.companyNotes;
    return sendSuccess(res, 200, 'Interview report retrieved', { report, interview });
  } catch (error) { return sendError(res, 500, error.message); }
};

const buildAndSaveReport = async (interview) => {
  const student = (interview.participants || []).find((p) => p.role === 'STUDENT');
  const studentId = student?.user || null;
  const [submissions, violations, answers] = await Promise.all([
    Submission.find({ interviewId: interview._id }).lean(),
    ViolationLog.find({ interviewId: interview._id }).lean(),
    Answer.find({ interview: interview._id }).lean()
  ]);
  const tests = submissions.flatMap((s) => s.testResults || []);
  const testsPassed = tests.filter((t) => t.passed).length;
  const testsTotal = tests.length;
  const codingScore = submissions.length ? Math.round(submissions.reduce((a, s) => a + (s.score || 0), 0) / submissions.length) : 0;
  const scoredAnswers = answers.filter((a) => a.evaluationStatus === 'COMPLETED');
  const technicalScore = scoredAnswers.length
    ? Math.round(scoredAnswers.reduce((a, t) => a + (t.technicalScore || 0), 0) / scoredAnswers.length)
    : (interview.adaptiveTurns?.length ? Math.round(interview.adaptiveTurns.reduce((a, t) => a + (t.technicalScore || 0), 0) / interview.adaptiveTurns.length) : codingScore);
  const communicationScore = scoredAnswers.length
    ? Math.round(scoredAnswers.reduce((a, t) => a + (t.communicationScore || 0), 0) / scoredAnswers.length)
    : (interview.adaptiveTurns?.length ? Math.round(interview.adaptiveTurns.reduce((a, t) => a + (t.communicationScore || 0), 0) / interview.adaptiveTurns.length) : 0);
  const integrityScore = Math.max(0, 100 - violations.length * 10);
  const overallScore = Math.round((technicalScore * 0.35) + (codingScore * 0.35) + (communicationScore * 0.20) + (integrityScore * 0.10));
  const topicMap = {};
  for (const s of submissions) {
    const key = s.questionId ? String(s.questionId) : 'Coding';
    topicMap[key] = topicMap[key] || [];
    topicMap[key].push(s.score || 0);
  }
  const topicBreakdown = Object.entries(topicMap).map(([topic, scores]) => ({ topic, score: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) }));
  const strengths = [];
  const improvements = [];
  if (codingScore >= 75) strengths.push('Strong coding execution and test-case performance.');
  else if (submissions.length) improvements.push('Improve coding correctness and edge-case coverage.');
  if (technicalScore >= 75) strengths.push('Good technical reasoning across answered questions.');
  else if (scoredAnswers.length || interview.adaptiveTurns?.length) improvements.push('Strengthen technical explanations and fundamentals.');
  if (communicationScore >= 75) strengths.push('Clear technical communication was observed in the AI-evaluated answers.');
  else if (scoredAnswers.length || interview.adaptiveTurns?.length) improvements.push('Practice concise, structured explanations while answering.');
  if (violations.length === 0) strengths.push('No persisted integrity events were recorded.');
  else improvements.push(`Review ${violations.length} recorded integrity event(s).`);
  let aiSummary = `Interview completed with an overall measured score of ${overallScore}/100. ${strengths[0] || 'Continue practicing with structured technical interviews.'} ${improvements[0] || 'Maintain consistency across technical and coding questions.'}`;
  try {
    const aiResponse = await fetch(`${AI_SERVICE_URL}/api/ai/final-report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: interview.title,
        technicalScore,
        codingScore,
        communicationScore,
        integrityScore,
        violations: violations.length,
        adaptiveTurns: interview.adaptiveTurns || [],
        answers: scoredAnswers.map((a) => ({ summary: a.summary, technicalScore: a.technicalScore })),
        submissions: submissions.map((s) => ({ score: s.score, status: s.status, aiFeedback: s.aiFeedback }))
      })
    });
    const aiResult = await aiResponse.json();
    if (aiResponse.ok && aiResult.success && aiResult.data?.summary) aiSummary = aiResult.data.summary;
  } catch (_) {}
  const systemDesignDoc = await SystemDesign.findOne({ interviewId: interview._id }).lean();
  if (systemDesignDoc?.aiEvaluation?.summary) aiSummary += ` System Design Evaluation: ${systemDesignDoc.aiEvaluation.summary}`;

  return InterviewReport.findOneAndUpdate(
    { interviewId: interview._id },
    {
      interviewId: interview._id,
      studentId,
      technicalScore,
      codingScore,
      communicationScore,
      integrityScore,
      overallScore,
      questionsAnswered: Math.max(scoredAnswers.length, interview.adaptiveTurns?.length || 0),
      submissions: submissions.length,
      testsPassed,
      testsTotal,
      violations: violations.length,
      strengths,
      improvements,
      aiSummary,
      topicBreakdown,
      resumeSkills: interview.studentResume?.skills || [],
      systemDesignScore: systemDesignDoc?.aiEvaluation?.overallScore || null,
      generatedAt: new Date()
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
};

const generateReport = async (req, res) => {
  try {
    const interview = await Interview.findById(req.params.id);
    if (!interview) return sendError(res, 404, 'Interview not found');
    const allowed = String(interview.createdBy) === String(req.user._id) || req.user.accountRole === 'ADMIN';
    if (!allowed) return sendError(res, 403, 'Only the owning company or an admin can generate this report');
    const report = await buildAndSaveReport(interview);
    return sendSuccess(res, 200, 'Interview report generated', { report });
  } catch (error) {
    console.error('[Interview Report]', error);
    return sendError(res, 500, error.message);
  }
};

const mammoth = require('mammoth');

/**
 * Upload binary PDF or DOCX resume, extract text, run AI parsing, and persist structured resume
 * POST /api/interviews/:id/resume/upload
 */
const uploadResumeFile = async (req, res) => {
  try {
    const interview = await Interview.findOne({
      _id: req.params.id,
      $or: [{ createdBy: req.user._id }, { 'participants.user': req.user._id }]
    });

    if (!interview) return sendError(res, 404, 'Interview not found');
    if (!req.file) return sendError(res, 400, 'No resume file uploaded');

    const originalName = req.file.originalname || 'resume';
    const ext = path.extname(originalName).toLowerCase();
    const mimeType = req.file.mimetype;

    const allowedExts = ['.pdf', '.docx', '.txt', '.md', '.text'];
    const allowedMimes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'application/octet-stream',
      'text/plain',
      'text/markdown'
    ];

    if (!allowedExts.includes(ext) || (!allowedMimes.includes(mimeType) && !mimeType.includes('text'))) {
      return sendError(res, 400, `Only PDF, DOCX, TXT, and MD resumes are supported.`);
    }

    let extractedText = '';

    if (ext === '.pdf' || mimeType === 'application/pdf') {
      try {
        const { PDFParse } = require('pdf-parse');
        const parser = new PDFParse({ data: req.file.buffer });
        const pdfData = await parser.getText();
        await parser.destroy();
        extractedText = String(pdfData.text || '').trim();
      } catch (pdfErr) {
        return sendError(res, 500, `Failed to extract text from PDF.`);
      }
    } else if (ext === '.docx' || mimeType.includes('wordprocessingml')) {
      try {
        const docxData = await mammoth.extractRawText({ buffer: req.file.buffer });
        extractedText = String(docxData.value || '').trim();
      } catch (docxErr) {
        return sendError(res, 500, `Failed to extract text from DOCX.`);
      }
    } else if (['.txt', '.md', '.text'].includes(ext) || mimeType.includes('text')) {
      extractedText = req.file.buffer.toString('utf8').trim();
    }

    if (!extractedText || extractedText.length < 10) {
      return sendError(res, 422, 'The uploaded document appears to be empty or unreadable.');
    }

    // Call AI Monitoring Service to parse raw text into structured resume JSON
    let parsedResume = {
      name: req.user.fullName || 'Student',
      email: req.user.email || '',
      skills: [],
      technologies: [],
      projects: [],
      education: [],
      experience: []
    };

    try {
      const aiResponse = await fetch(`${process.env.AI_MONITORING_URL || 'http://localhost:5050'}/api/ai/parse-resume`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: extractedText })
      });

      if (aiResponse.ok) {
        const aiResult = await aiResponse.json();
        if (aiResult.success && aiResult.data?.resume) {
          parsedResume = { ...parsedResume, ...aiResult.data.resume };
        }
      }
    } catch (aiErr) {
      console.warn('[Resume AI Parser Warning]:', aiErr.message);
    }

    const safeFileName = path.basename(originalName).replace(/[^a-zA-Z0-9._-]/g, '_');

    interview.studentResume = {
      fileName: safeFileName,
      fileType: ext.replace('.', '').toUpperCase(),
      text: extractedText.slice(0, 30000),
      name: parsedResume.name || req.user.fullName,
      email: parsedResume.email || req.user.email,
      skills: Array.isArray(parsedResume.skills) ? parsedResume.skills.slice(0, 50) : [],
      technologies: Array.isArray(parsedResume.technologies) ? parsedResume.technologies.slice(0, 50) : [],
      projects: Array.isArray(parsedResume.projects) ? parsedResume.projects.slice(0, 30) : [],
      education: Array.isArray(parsedResume.education) ? parsedResume.education.slice(0, 20) : [],
      experience: Array.isArray(parsedResume.experience) ? parsedResume.experience.slice(0, 30) : [],
      uploadedAt: new Date()
    };

    await interview.save();

    // Auto-generate questions for AI mock interviews only when the selected mode is PROJECT or MIXED.
    if (interview.title.includes('AI Mock Interview') && ['PROJECT', 'MIXED'].includes(interview.mockMode) && (parsedResume.skills?.length > 0 || parsedResume.projects?.length > 0)) {
      try {
        const skills = [...(parsedResume.skills || []), ...(parsedResume.technologies || [])].filter(Boolean);
        const generated = await generateQuestionsFromAi({
          mode: interview.mockMode,
          numberOfQuestions: 3,
          skills: skills.slice(0, 8),
          role: `Student with projects: ${(parsedResume.projects || []).slice(0, 2).join(', ')}`,
          type: 'TEXT'
        });
        await persistGeneratedQuestions({ interviewId: interview._id, userId: req.user._id, questions: generated });
      } catch (err) {
        console.warn('[Auto-Generate AI Questions Warning]:', err.message);
      }
    }

    return sendSuccess(res, 200, 'Resume uploaded and processed successfully', {
      resume: interview.studentResume
    });
  } catch (error) {
    console.error('[Upload Resume Error]:', error);
    return sendError(res, 500, `Resume processing error: ${error.message}`);
  }
};

const getResumeProfile = async (req, res) => {
  try {
    const interview = await Interview.findOne({
      _id: req.params.id,
      $or: [{ createdBy: req.user._id }, { 'participants.user': req.user._id }]
    }).select('studentResume').lean();

    if (!interview) return sendError(res, 404, 'Interview not found');
    return sendSuccess(res, 200, 'Student resume retrieved', { resume: interview.studentResume || null });
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

/**
 * Generate AI questions based on extracted resume skills and projects
 * POST /api/interviews/:id/resume/generate-questions
 */
const generateResumeQuestions = async (req, res) => {
  try {
    const interview = await Interview.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!interview) return sendError(res, 404, 'Interview not found or unauthorized');

    const resume = interview.studentResume || {};
    const skills = [...(resume.skills || []), ...(resume.technologies || [])].filter(Boolean);
    const projects = resume.projects || [];

    if (!skills.length && !projects.length) {
      return sendError(res, 400, 'No student resume skills or projects found. Please upload a resume first.');
    }

    const aiResponse = await fetch(`${process.env.AI_MONITORING_URL || 'http://localhost:5050'}/api/ai/generate-questions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role: `Student with projects: ${projects.slice(0, 2).join(', ')}`,
        skills: skills.slice(0, 5),
        difficulty: 'MEDIUM',
        type: 'TEXT',
        numberOfQuestions: 3,
        mode: interview.mockMode || 'PROJECT'
      })
    });

    const aiResult = await aiResponse.json();
    if (!aiResponse.ok || !aiResult.success) {
      return sendError(res, 502, aiResult.message || 'Failed to generate resume-based questions');
    }

    const generated = aiResult.data?.questions || [];

    const lastQuestion = await Question.findOne({ interview: interview._id }).sort({ order: -1 }).select('order').lean();
    let nextOrder = (lastQuestion?.order || 0) + 1;

    const savedQuestions = await Question.insertMany(generated.map((q) => ({
      interview: interview._id,
      createdBy: req.user._id,
      source: 'AI',
      type: q.type || 'TEXT',
      prompt: q.prompt,
      topic: q.topic || 'Resume Review',
      difficulty: q.difficulty || 'MEDIUM',
      order: nextOrder++,
      expectedKeywords: q.expectedKeywords || []
    })));

    return sendSuccess(res, 201, 'Resume-based interview questions generated and saved', {
      questions: savedQuestions
    });
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

/**
 * Save / update System Design interactive canvas state
 * POST /api/interviews/:id/system-design/state
 */
const saveSystemDesignState = async (req, res) => {
  try {
    const { questionId, canvasState, nodes, edges, diagramNotes } = req.body;
    const interview = await Interview.findById(req.params.id);
    if (!interview) return sendError(res, 404, 'Interview not found');

    const isParticipant = interview.participants.some(p => String(p.user) === String(req.user._id));
    const isOwner = String(interview.createdBy) === String(req.user._id);
    if (!isParticipant && !isOwner) return sendError(res, 403, 'Unauthorized access to interview room');

    const studentId = isParticipant && req.user.accountRole === 'STUDENT' ? req.user._id : (interview.participants.find(p => p.role === 'STUDENT')?.user || req.user._id);

    const doc = await SystemDesign.findOneAndUpdate(
      { interviewId: req.params.id, studentId },
      {
        interviewId: req.params.id,
        questionId: questionId || null,
        studentId,
        canvasState: canvasState || {},
        nodes: Array.isArray(nodes) ? nodes : [],
        edges: Array.isArray(edges) ? edges : [],
        diagramNotes: String(diagramNotes || '').slice(0, 10000)
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    return sendSuccess(res, 200, 'System design canvas state saved', { systemDesign: doc });
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

/**
 * Get current System Design canvas state
 * GET /api/interviews/:id/system-design/state
 */
const getSystemDesignState = async (req, res) => {
  try {
    const doc = await SystemDesign.findOne({ interviewId: req.params.id }).lean();
    return sendSuccess(res, 200, 'System design state fetched', { systemDesign: doc || null });
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

/**
 * Submit final System Design architecture & trigger AI evaluation
 * POST /api/interviews/:id/system-design/submit
 */
const submitSystemDesign = async (req, res) => {
  try {
    const { questionId, canvasState, nodes, edges, diagramNotes, questionPrompt } = req.body;
    const interview = await Interview.findById(req.params.id);
    if (!interview) return sendError(res, 404, 'Interview not found');

    const studentId = req.user._id;

    let aiEvaluation = null;
    try {
      const aiResponse = await fetch(`${process.env.AI_MONITORING_URL || 'http://localhost:5050'}/api/ai/system-design-evaluation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionPrompt: questionPrompt || 'Design a scalable distributed architecture',
          nodes: Array.isArray(nodes) ? nodes : [],
          edges: Array.isArray(edges) ? edges : [],
          studentNotes: diagramNotes || ''
        })
      });

      if (aiResponse.ok) {
        const aiResult = await aiResponse.json();
        if (aiResult.success && aiResult.data?.evaluation) {
          aiEvaluation = aiResult.data.evaluation;
        }
      }
    } catch (aiErr) {
      console.warn('[System Design AI Eval Warning]:', aiErr.message);
    }

    const doc = await SystemDesign.findOneAndUpdate(
      { interviewId: req.params.id, studentId },
      {
        interviewId: req.params.id,
        questionId: questionId || null,
        studentId,
        canvasState: canvasState || {},
        nodes: Array.isArray(nodes) ? nodes : [],
        edges: Array.isArray(edges) ? edges : [],
        diagramNotes: String(diagramNotes || '').slice(0, 10000),
        aiEvaluation,
        isSubmitted: true,
        submittedAt: new Date()
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    return sendSuccess(res, 200, 'System design architecture submitted successfully', {
      systemDesign: doc
    });
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

/**
 * Get System Design AI Evaluation
 * GET /api/interviews/:id/system-design/evaluation
 */
const getSystemDesignEvaluation = async (req, res) => {
  try {
    const doc = await SystemDesign.findOne({ interviewId: req.params.id }).select('aiEvaluation nodes edges diagramNotes submittedAt').lean();
    if (!doc) return sendError(res, 404, 'No system design submission found');
    return sendSuccess(res, 200, 'System design evaluation fetched', { evaluation: doc.aiEvaluation, systemDesign: doc });
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

module.exports = {
  createInterview,
  getInterviews,
  getInterviewById,
  getInterviewByRoomCode,
  joinInterviewByCode,
  startInterview,
  completeInterview,
  getDashboardSummary,
  getStudents,
  getAnalytics,
  recordAdaptiveTurn,
  updateNotes,
  saveResumeProfile,
  getReport,
  generateReport,
  uploadResumeFile,
  getResumeProfile,
  generateResumeQuestions,
  saveSystemDesignState,
  getSystemDesignState,
  submitSystemDesign,
  getSystemDesignEvaluation,
  createMockInterview,
  createP2PInterview,
  textSubmit,
  getAnswers,
  getAnswerById,
  cancelInterview
};
