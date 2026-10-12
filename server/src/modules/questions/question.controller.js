const mongoose = require('mongoose');
const Question = require('./question.model');
const Interview = require('../interviews/interview.model');
const User = require('../auth/auth.model');
const { getAiServiceHeaders } = require('../../shared/utils/ai-service.utils');

const deriveTitle = (prompt, topic, type) => {
  if (!prompt) return topic || `${type || 'Technical'} Question`;
  const firstSentence = prompt.split(/[.\n]/)[0].trim();
  if (firstSentence.length <= 60 && firstSentence.length > 3) {
    return firstSentence;
  }
  return firstSentence.slice(0, 57).trim() + '…';
};

const sanitizeQuestionForClient = (question, allowPrivilegedFields = false) => {
  if (!question || typeof question !== 'object') return question;
  const safeQuestion = { ...question };

  if (!safeQuestion.title) {
    safeQuestion.title = deriveTitle(safeQuestion.prompt, safeQuestion.topic, safeQuestion.type);
  }

  // If examples are missing or empty, populate safe public examples from testCases before stripping testCases
  if ((!Array.isArray(safeQuestion.examples) || safeQuestion.examples.length === 0) && Array.isArray(safeQuestion.testCases) && safeQuestion.testCases.length > 0) {
    safeQuestion.examples = safeQuestion.testCases
      .filter((tc) => !tc.hidden && !tc.isSecret)
      .slice(0, 2)
      .map((tc, idx) => ({
        input: tc.input ?? '',
        output: tc.expectedOutput ?? tc.expected ?? '',
        explanation: tc.explanation || `Sample Case ${idx + 1}`
      }));
  }

  if (!allowPrivilegedFields) {
    delete safeQuestion.referenceSolution;
    delete safeQuestion.solution;
    delete safeQuestion.hiddenTests;
    delete safeQuestion.correctOptionIndex;
    delete safeQuestion.testCases;
  }

  return safeQuestion;
};

/**
 * Create a new question in the company repository or attach to an interview
 * POST /api/questions
 */
const createQuestion = async (req, res) => {
  try {
    const {
      title,
      interview,
      interviewId,
      source,
      type,
      prompt,
      topic,
      difficulty,
      order,
      options,
      correctOptionIndex,
      expectedKeywords,
      constraints,
      examples,
      testCases,
      starterCode,
      driverCode,
      referenceSolution,
      solution,
      hiddenTests,
      initialCanvasState,
      isPublished,
      tags
    } = req.body;

    if (!type || !prompt) {
      return res.status(400).json({ success: false, message: 'type and prompt are required' });
    }

    const targetInterviewId = interviewId || interview || null;
    let finalCompanyId = req.user._id;

    if (targetInterviewId) {
      const interviewExists = await Interview.findById(targetInterviewId);
      if (!interviewExists) {
        return res.status(404).json({ success: false, message: 'Target interview not found' });
      }
      if (String(interviewExists.createdBy) !== String(req.user._id) && req.user.accountRole !== 'ADMIN') {
        return res.status(403).json({ success: false, message: 'You can only add questions to interviews you own.' });
      }
      finalCompanyId = interviewExists.createdBy;
    }

    const cleanTitle = (title && title.trim()) || deriveTitle(prompt, topic, type);

    let nextOrder = Number(order) || 1;
    if (targetInterviewId) {
      const lastQ = await Question.findOne({ interview: targetInterviewId }).sort({ order: -1 }).select('order').lean();
      nextOrder = (lastQ?.order || 0) + 1;
    }

    const question = await Question.create({
      title: cleanTitle,
      interview: targetInterviewId,
      companyId: finalCompanyId,
      createdBy: req.user._id,
      source: source || 'MANUAL',
      type,
      prompt: prompt.trim(),
      topic: topic || '',
      difficulty: difficulty || 'MEDIUM',
      order: nextOrder,
      isPublished: Boolean(isPublished),
      isRepositoryQuestion: true,
      tags: Array.isArray(tags) ? tags : [],
      options,
      correctOptionIndex,
      expectedKeywords: expectedKeywords || [],
      constraints: constraints || [],
      examples: examples || [],
      testCases: testCases || [],
      starterCode: starterCode || driverCode || '',
      driverCode: driverCode || starterCode || '',
      referenceSolution: referenceSolution || solution || '',
      solution: solution || referenceSolution || '',
      hiddenTests: hiddenTests || [],
      initialCanvasState
    });

    return res.status(201).json({
      success: true,
      message: 'Question created successfully in repository',
      data: { question }
    });
  } catch (error) {
    console.error('[Questions] Create error:', error);
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: 'A question with this order already exists for this interview' });
    }
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Update an existing question in the company repository
 * PUT /api/questions/:id
 */
const updateQuestion = async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);
    if (!question) {
      return res.status(404).json({ success: false, message: 'Question not found' });
    }

    const isOwner = String(question.companyId || question.createdBy) === String(req.user._id);
    if (!isOwner && req.user.accountRole !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'You are not authorized to update this question.' });
    }

    const allowedUpdates = [
      'prompt', 'topic', 'difficulty', 'type', 'isPublished',
      'options', 'correctOptionIndex', 'expectedKeywords', 'constraints',
      'examples', 'testCases', 'starterCode', 'driverCode', 'solution',
      'referenceSolution', 'hiddenTests', 'tags', 'initialCanvasState'
    ];

    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) {
        question[field] = req.body[field];
      }
    });

    if (req.body.title !== undefined) {
      question.title = (req.body.title && req.body.title.trim()) || deriveTitle(question.prompt, question.topic, question.type);
    }

    await question.save();

    return res.status(200).json({
      success: true,
      message: 'Question updated successfully',
      data: { question }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Toggle question publication for student practice
 * PATCH /api/questions/:id/publish
 */
const togglePublishQuestion = async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);
    if (!question) {
      return res.status(404).json({ success: false, message: 'Question not found' });
    }

    const isOwner = String(question.companyId || question.createdBy) === String(req.user._id);
    if (!isOwner && req.user.accountRole !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'You are not authorized to modify this question.' });
    }

    question.isPublished = req.body?.isPublished !== undefined
      ? Boolean(req.body.isPublished)
      : !question.isPublished;

    await question.save();

    return res.status(200).json({
      success: true,
      message: `Question ${question.isPublished ? 'published for practice' : 'moved to private'}`,
      data: { isPublished: question.isPublished, question }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Assign a repository question to an interview with snapshot cloning
 * POST /api/questions/assign-to-interview
 */
const assignQuestionToInterview = async (req, res) => {
  try {
    const { questionId, interviewId } = req.body;
    if (!questionId || !interviewId) {
      return res.status(400).json({ success: false, message: 'questionId and interviewId are required' });
    }

    const [question, interview] = await Promise.all([
      Question.findById(questionId),
      Interview.findById(interviewId)
    ]);

    if (!question) return res.status(404).json({ success: false, message: 'Question not found' });
    if (!interview) return res.status(404).json({ success: false, message: 'Interview not found' });

    const isOwner = String(question.companyId || question.createdBy) === String(req.user._id);
    const ownsInterview = String(interview.createdBy) === String(req.user._id);

    if ((!isOwner || !ownsInterview) && req.user.accountRole !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'You can only assign your company questions to your interviews.' });
    }

    const lastQuestion = await Question.findOne({ interview: interview._id }).sort({ order: -1 }).select('order').lean();
    const nextOrder = (lastQuestion?.order || 0) + 1;

    // Snapshot creation: copies question into interview so future edits do NOT alter scheduled/completed interviews
    const snapshot = await Question.create({
      title: question.title || deriveTitle(question.prompt, question.topic, question.type),
      interview: interview._id,
      companyId: interview.createdBy,
      createdBy: req.user._id,
      source: question.source,
      type: question.type,
      prompt: question.prompt,
      topic: question.topic,
      difficulty: question.difficulty,
      order: nextOrder,
      isPublished: question.isPublished,
      isRepositoryQuestion: false,
      tags: question.tags,
      options: question.options,
      correctOptionIndex: question.correctOptionIndex,
      expectedKeywords: question.expectedKeywords,
      constraints: question.constraints,
      examples: question.examples,
      testCases: question.testCases,
      starterCode: question.starterCode,
      driverCode: question.driverCode,
      solution: question.solution,
      referenceSolution: question.referenceSolution,
      hiddenTests: question.hiddenTests,
      initialCanvasState: question.initialCanvasState
    });

    return res.status(201).json({
      success: true,
      message: 'Question assigned to interview successfully',
      data: { question: snapshot }
    });
  } catch (error) {
    console.error('[Questions] Assign error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Fetch questions by interview session
 * GET /api/questions/interview/:interviewId
 */
const getQuestionsByInterview = async (req, res) => {
  try {
    const { interviewId } = req.params;
    const interviewExists = await Interview.findById(interviewId).select('createdBy participants').lean();
    if (!interviewExists) {
      return res.status(404).json({ success: false, message: 'Interview not found' });
    }
    const allowed = String(interviewExists.createdBy) === String(req.user._id)
      || (interviewExists.participants || []).some((p) => String(p.user) === String(req.user._id))
      || req.user.accountRole === 'ADMIN';
    if (!allowed) return res.status(403).json({ success: false, message: 'You are not authorized to view these questions.' });

    const isPrivilegedViewer = String(interviewExists.createdBy) === String(req.user._id)
      || req.user.accountRole === 'ADMIN';

    const questions = await Question.find({ interview: interviewId }).sort({ order: 1 }).lean();
    return res.status(200).json({
      success: true,
      message: 'Questions fetched successfully',
      data: { questions: questions.map((question) => sanitizeQuestionForClient(question, isPrivilegedViewer)) }
    });
  } catch (error) {
    console.error('[Questions] Fetch error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch questions' });
  }
};

/**
 * Fetch question by ID with strict role-based data sanitization
 * GET /api/questions/:id
 */
const getQuestionById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid question ID format' });
    }

    const question = await Question.findById(id).lean();
    if (!question) return res.status(404).json({ success: false, message: 'Question not found' });

    const isCompanyUser = req.user.accountRole === 'COMPANY';
    const isAdmin = req.user.accountRole === 'ADMIN';

    let isCompanyOwner = isCompanyUser && (
      String(question.companyId?._id || question.companyId) === String(req.user._id) ||
      String(question.createdBy?._id || question.createdBy) === String(req.user._id)
    );

    let isInterviewParticipant = false;
    if (question.interview) {
      const interview = await Interview.findById(question.interview).select('createdBy participants').lean();
      if (interview) {
        if (isCompanyUser && String(interview.createdBy) === String(req.user._id)) isCompanyOwner = true;
        if ((interview.participants || []).some((p) => String(p.user) === String(req.user._id))) {
          isInterviewParticipant = true;
        }
      }
    }

    const isCreator = String(question.createdBy?._id || question.createdBy) === String(req.user._id);
    const canView = isAdmin || isCompanyOwner || isInterviewParticipant || isCreator || Boolean(question.isPublished);
    if (!canView) {
      return res.status(403).json({ success: false, message: 'You are not authorized to view this question.' });
    }

    const allowPrivileged = isAdmin || isCompanyOwner;
    return res.status(200).json({
      success: true,
      message: 'Question fetched successfully',
      data: { question: sanitizeQuestionForClient(question, allowPrivileged) }
    });
  } catch (error) {
    console.error('[Questions] Get by ID error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to fetch question' });
  }
};

/**
 * Company Question Library (Company repository)
 * GET /api/questions/library
 */
const getQuestionLibrary = async (req, res) => {
  try {
    const targetCompanyId = req.user.accountRole === 'ADMIN' && req.query.companyId
      ? req.query.companyId
      : req.user._id;

    const { type, difficulty, topic, search, source, isPublished } = req.query;

    const filter = {
      $or: [
        { companyId: targetCompanyId },
        { createdBy: targetCompanyId }
      ]
    };

    if (type && type !== 'ALL') {
      filter.type = (type === 'THEORY' || type === 'TEXT') ? { $in: ['THEORY', 'TEXT'] } : type;
    }
    if (difficulty && difficulty !== 'ALL') filter.difficulty = difficulty.toUpperCase();
    if (topic && topic !== 'ALL') filter.topic = new RegExp(topic, 'i');
    if (source && source !== 'ALL') filter.source = source;
    if (isPublished !== undefined && isPublished !== 'ALL') {
      filter.isPublished = isPublished === 'true';
    }

    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$and = filter.$and || [];
      filter.$and.push({
        $or: [
          { title: searchRegex },
          { prompt: searchRegex },
          { topic: searchRegex },
          { tags: searchRegex }
        ]
      });
    }

    const questions = await Question.find(filter)
      .populate('interview', 'title roomCode status')
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: {
        questions: questions.map((q) => sanitizeQuestionForClient(q, true)),
        count: questions.length
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Public/Authorized Practice Library for Candidates and Interviewers
 * GET /api/questions/practice
 */
const getPracticeQuestions = async (req, res) => {
  try {
    const { type, difficulty, topic, search, companyId } = req.query;
    const filter = {};

    if (req.user.accountRole === 'STUDENT') {
      // Find interviews where student is enrolled
      const studentInterviews = await Interview.find({ 'participants.user': req.user._id }).select('_id').lean();
      const participantInterviewIds = studentInterviews.map((i) => i._id);

      // Candidate can only see published questions OR questions from their interviews
      filter.$or = [
        { isPublished: true },
        { interview: { $in: participantInterviewIds } }
      ];

      if (companyId) {
        filter.companyId = companyId;
      }
    } else if (req.user.accountRole === 'COMPANY') {
      // Company can browse their repository or all published questions
      filter.$or = [
        { companyId: req.user._id },
        { createdBy: req.user._id },
        { isPublished: true }
      ];
    }

    if (type && type !== 'ALL') {
      filter.type = (type === 'THEORY' || type === 'TEXT') ? { $in: ['THEORY', 'TEXT'] } : type;
    }
    if (difficulty && difficulty !== 'ALL') filter.difficulty = difficulty.toUpperCase();
    if (topic && topic !== 'ALL') filter.topic = new RegExp(topic, 'i');

    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$and = filter.$and || [];
      filter.$and.push({
        $or: [
          { title: searchRegex },
          { prompt: searchRegex },
          { topic: searchRegex },
          { tags: searchRegex }
        ]
      });
    }

    const questions = await Question.find(filter)
      .populate('companyId', 'fullName email')
      .sort({ createdAt: -1 })
      .lean();

    const isPrivileged = req.user.accountRole === 'ADMIN';

    return res.status(200).json({
      success: true,
      message: 'Practice questions retrieved successfully',
      data: {
        questions: questions.map((q) => {
          const isOwner = String(q.companyId?._id || q.companyId || q.createdBy) === String(req.user._id);
          return sanitizeQuestionForClient(q, isPrivileged || isOwner);
        }),
        count: questions.length
      }
    });
  } catch (error) {
    console.error('[Questions] Practice fetch error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Delete question from repository
 * DELETE /api/questions/:id
 */
const deleteQuestion = async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);
    if (!question) {
      return res.status(404).json({ success: false, message: 'Question not found' });
    }

    const isOwner = String(question.companyId || question.createdBy) === String(req.user._id);
    if (!isOwner && req.user.accountRole !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'You are not authorized to delete this question.' });
    }

    await Question.deleteOne({ _id: question._id });
    return res.status(200).json({ success: true, message: 'Question deleted successfully from repository' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to delete question' });
  }
};

/**
 * Bulk create questions into company repository or interview
 * POST /api/questions/bulk
 */
const bulkCreateQuestions = async (req, res) => {
  try {
    const { interviewId, questions, isPublished } = req.body;
    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ success: false, message: 'questions array is required' });
    }

    let finalCompanyId = req.user._id;
    let finalInterviewId = null;
    let nextOrder = 1;

    if (interviewId) {
      const interview = await Interview.findOne({ _id: interviewId, createdBy: req.user._id });
      if (!interview && req.user.accountRole !== 'ADMIN') {
        return res.status(404).json({ success: false, message: 'Interview not found or not owned by you' });
      }
      if (interview) {
        finalInterviewId = interview._id;
        finalCompanyId = interview.createdBy;
        const lastQuestion = await Question.findOne({ interview: interview._id }).sort({ order: -1 }).select('order').lean();
        nextOrder = (lastQuestion?.order || 0) + 1;
      }
    }

    const docs = questions.map((question) => ({
      title: question.title || deriveTitle(question.prompt, question.topic, question.type),
      interview: finalInterviewId,
      companyId: finalCompanyId,
      createdBy: req.user._id,
      source: question.source || 'AI',
      type: question.type || 'CODING',
      prompt: question.prompt,
      topic: question.topic || '',
      difficulty: question.difficulty || 'MEDIUM',
      order: nextOrder++,
      isPublished: question.isPublished !== undefined ? Boolean(question.isPublished) : Boolean(isPublished),
      isRepositoryQuestion: true,
      tags: question.tags || [],
      options: question.options,
      correctOptionIndex: question.correctOptionIndex,
      expectedKeywords: question.expectedKeywords || [],
      constraints: question.constraints || [],
      examples: question.examples || [],
      testCases: question.testCases || [],
      starterCode: question.starterCode || question.driverCode || '',
      driverCode: question.driverCode || question.starterCode || '',
      referenceSolution: question.referenceSolution || question.solution || '',
      solution: question.solution || question.referenceSolution || '',
      hiddenTests: question.hiddenTests || [],
      initialCanvasState: question.initialCanvasState
    }));

    const created = await Question.insertMany(docs);
    return res.status(201).json({
      success: true,
      message: `${created.length} questions saved to company repository successfully`,
      data: { questions: created, count: created.length }
    });
  } catch (error) {
    console.error('[Questions] Bulk create error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Generate questions using Gemini and optionally persist to repository
 * POST /api/questions/generate-ai
 */
const generateQuestionsWithAI = async (req, res) => {
  try {
    const { role, skills, difficulty, type, numberOfQuestions, interviewId, save } = req.body;

    if (!role || !Array.isArray(skills) || skills.length === 0) {
      return res.status(400).json({ success: false, message: 'role and at least one skill are required' });
    }

    const aiResponse = await fetch(`${process.env.AI_MONITORING_URL || 'http://localhost:5050'}/api/ai/generate-questions`, {
      method: 'POST',
      headers: getAiServiceHeaders(),
      signal: AbortSignal.timeout(30000),
      body: JSON.stringify({
        role,
        skills,
        difficulty: difficulty || 'MEDIUM',
        type: type || 'CODING',
        numberOfQuestions: Math.min(Math.max(Number(numberOfQuestions) || 1, 1), 10),
        mode: req.body.mode
      })
    });

    const aiResult = await aiResponse.json();
    if (!aiResponse.ok || !aiResult.success) {
      return res.status(aiResponse.status || 502).json({
        success: false,
        message: aiResult.message || 'AI question generation failed'
      });
    }

    const generated = aiResult.data?.questions || [];
    let savedQuestions = [];

    if (save) {
      let finalCompanyId = req.user._id;
      let finalInterviewId = null;

      if (interviewId) {
        const interview = await Interview.findOne({ _id: interviewId, createdBy: req.user._id });
        if (!interview && req.user.accountRole !== 'ADMIN') {
          return res.status(404).json({ success: false, message: 'Interview not found or not owned by you' });
        }
        if (interview) {
          finalCompanyId = interview.createdBy;
          finalInterviewId = interview._id;
        }
      }

      let nextOrder = 1;
      if (finalInterviewId) {
        const lastQ = await Question.findOne({ interview: finalInterviewId }).sort({ order: -1 }).select('order').lean();
        nextOrder = (lastQ?.order || 0) + 1;
      }

      savedQuestions = await Question.insertMany(generated.map((question) => ({
        title: question.title || deriveTitle(question.prompt || question.question, question.topic, question.type),
        interview: finalInterviewId,
        companyId: finalCompanyId,
        createdBy: req.user._id,
        source: 'AI',
        type: question.type || type || 'CODING',
        prompt: question.prompt || question.question,
        topic: question.topic || '',
        difficulty: question.difficulty || difficulty || 'MEDIUM',
        order: nextOrder++,
        isPublished: false,
        isRepositoryQuestion: true,
        options: question.options,
        correctOptionIndex: question.correctOptionIndex,
        expectedKeywords: question.expectedKeywords || [],
        constraints: question.constraints || [],
        examples: question.examples || [],
        testCases: question.testCases || [],
        starterCode: question.starterCode || question.driverCode || '',
        driverCode: question.driverCode || question.starterCode || '',
        referenceSolution: question.referenceSolution || question.solution || '',
        solution: question.solution || question.referenceSolution || '',
        hiddenTests: question.hiddenTests || []
      })));
    }

    return res.status(200).json({
      success: true,
      message: savedQuestions.length ? 'AI questions generated and saved to repository' : 'AI questions generated successfully',
      data: { questions: generated, savedQuestions, count: generated.length }
    });
  } catch (error) {
    console.error('[Questions] AI generation error:', error);
    return res.status(502).json({ success: false, message: 'AI question generation service unavailable. Please try again.' });
  }
};

/**
 * List companies with available questions for candidate filtering
 * GET /api/questions/companies
 */
const getCompaniesForPractice = async (req, res) => {
  try {
    const publishedQuestions = await Question.find({ isPublished: true }).select('companyId createdBy').lean();
    const companyIds = [...new Set(publishedQuestions.map((q) => String(q.companyId || q.createdBy)).filter(Boolean))];

    const companies = await User.find({
      $or: [
        { _id: { $in: companyIds } },
        { accountRole: 'COMPANY' }
      ]
    }).select('_id fullName email').lean();

    return res.status(200).json({
      success: true,
      data: { companies }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createQuestion,
  updateQuestion,
  togglePublishQuestion,
  assignQuestionToInterview,
  getQuestionsByInterview,
  getQuestionById,
  getQuestionLibrary,
  getPracticeQuestions,
  deleteQuestion,
  bulkCreateQuestions,
  generateQuestionsWithAI,
  getCompaniesForPractice,
  sanitizeQuestionForClient
};
