const Question = require('./question.model');
const Interview = require('../interviews/interview.model');

const createQuestion = async (req, res) => {
  try {
    const {
      interview,
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
      testCases
    } = req.body;

    if (!interview || !type || !prompt) {
      return res.status(400).json({ success: false, message: 'interview, type and prompt are required' });
    }

    const interviewExists = await Interview.findById(interview);
    if (!interviewExists) {
      return res.status(404).json({ success: false, message: 'Interview not found' });
    }
    if (String(interviewExists.createdBy) !== String(req.user._id) && req.user.accountRole !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'You can only add questions to interviews you own.' });
    }

    const question = await Question.create({
      interview,
      createdBy: req.user._id,
      source: source || 'MANUAL',
      type,
      prompt,
      topic: topic || '',
      difficulty: difficulty || 'MEDIUM',
      order: Number(order) || 1,
      options,
      correctOptionIndex,
      expectedKeywords,
      constraints,
      examples,
      testCases
    });

    return res.status(201).json({ success: true, message: 'Question created successfully', data: { question } });
  } catch (error) {
    console.error('[Questions] Create error:', error);
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: 'A question with this order already exists for this interview' });
    }
    return res.status(500).json({ success: false, message: error.message });
  }
};

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
    const questions = await Question.find({ interview: interviewId })
      .sort({ order: 1 })
      .select('-correctOptionIndex -testCases');
    return res.status(200).json({ success: true, message: 'Questions fetched successfully', data: { questions } });
  } catch (error) {
    console.error('[Questions] Fetch error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch questions' });
  }
};

const deleteQuestion = async (req, res) => {
  try {
    const question = await Question.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!question) {
      return res.status(404).json({ success: false, message: 'Question not found or not owned by you' });
    }

    await Question.deleteOne({ _id: question._id });
    return res.status(200).json({ success: true, message: 'Question deleted successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to delete question' });
  }
};

const getQuestionById = async (req, res) => {
  try {
    const question = await Question.findById(req.params.id).select('-correctOptionIndex -testCases').lean();
    if (!question) return res.status(404).json({ success: false, message: 'Question not found' });
    const interview = await Interview.findById(question.interview).select('createdBy participants').lean();
    const allowed = interview && (String(interview.createdBy) === String(req.user._id) || (interview.participants || []).some((p) => String(p.user) === String(req.user._id)) || req.user.accountRole === 'ADMIN');
    if (!allowed) return res.status(403).json({ success: false, message: 'You are not authorized to view this question.' });
    return res.status(200).json({ success: true, message: 'Question fetched successfully', data: { question } });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch question' });
  }
};

const getQuestionLibrary = async (req, res) => {
  try {
    const interviews = await Interview.find({ createdBy: req.user._id }).select('_id').lean();
    const interviewIds = interviews.map((x) => x._id);
    const questions = await Question.find({ createdBy: req.user._id, interview: { $in: interviewIds } })
      .sort({ createdAt: -1 })
      .select('-correctOptionIndex -testCases')
      .lean();
    return res.status(200).json({ success: true, data: { questions, count: questions.length } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};


const bulkCreateQuestions = async (req, res) => {
  try {
    const { interviewId, questions } = req.body;
    if (!interviewId || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ success: false, message: 'interviewId and questions are required' });
    }

    const interview = await Interview.findOne({ _id: interviewId, createdBy: req.user._id });
    if (!interview) {
      return res.status(404).json({ success: false, message: 'Interview not found or not owned by you' });
    }

    const lastQuestion = await Question.findOne({ interview: interview._id }).sort({ order: -1 }).select('order').lean();
    let nextOrder = (lastQuestion?.order || 0) + 1;

    const docs = questions.map((question) => ({
      interview: interview._id,
      createdBy: req.user._id,
      source: question.source || 'AI',
      type: question.type,
      prompt: question.prompt,
      topic: question.topic || '',
      difficulty: question.difficulty || 'MEDIUM',
      order: nextOrder++,
      options: question.options,
      correctOptionIndex: question.correctOptionIndex,
      expectedKeywords: question.expectedKeywords || [],
      constraints: question.constraints,
      examples: question.examples,
      testCases: question.testCases
    }));

    const created = await Question.insertMany(docs);
    return res.status(201).json({ success: true, message: `${created.length} questions created successfully`, data: { questions: created } });
  } catch (error) {
    console.error('[Questions] Bulk create error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const generateQuestionsWithAI = async (req, res) => {
  try {
    const { role, skills, difficulty, type, numberOfQuestions, interviewId, save } = req.body;

    if (!role || !Array.isArray(skills) || skills.length === 0) {
      return res.status(400).json({ success: false, message: 'role and at least one skill are required' });
    }

    const aiResponse = await fetch(`${process.env.AI_MONITORING_URL || 'http://localhost:5050'}/api/ai/generate-questions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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

    if (save && interviewId) {
      const interview = await Interview.findOne({ _id: interviewId, createdBy: req.user._id });
      if (!interview) {
        return res.status(404).json({ success: false, message: 'Interview not found or not owned by you' });
      }

      const lastQuestion = await Question.findOne({ interview: interview._id }).sort({ order: -1 }).select('order').lean();
      let nextOrder = (lastQuestion?.order || 0) + 1;

      savedQuestions = await Question.insertMany(generated.map((question) => ({
        interview: interview._id,
        createdBy: req.user._id,
        source: 'AI',
        type: question.type,
        prompt: question.prompt,
        topic: question.topic,
        difficulty: question.difficulty,
        order: nextOrder++,
        options: question.options,
        correctOptionIndex: question.correctOptionIndex,
        expectedKeywords: question.expectedKeywords || [],
        constraints: question.constraints,
        examples: question.examples,
        testCases: question.testCases
      })));
    }

    return res.status(200).json({
      success: true,
      message: savedQuestions.length ? 'AI questions generated and saved successfully' : 'AI questions generated successfully',
      data: { questions: generated, savedQuestions, count: generated.length }
    });
  } catch (error) {
    console.error('[Questions] AI generation error:', error);
    return res.status(502).json({ success: false, message: error.message || 'AI question generation service unavailable' });
  }
};

module.exports = { createQuestion, getQuestionsByInterview, getQuestionById, getQuestionLibrary, deleteQuestion, bulkCreateQuestions, generateQuestionsWithAI };
