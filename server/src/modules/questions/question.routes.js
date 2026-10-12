const express = require('express');
const {
  createQuestion,
  updateQuestion,
  togglePublishQuestion,
  assignQuestionToInterview,
  getQuestionsByInterview,
  getQuestionById,
  deleteQuestion,
  getQuestionLibrary,
  getPracticeQuestions,
  generateQuestionsWithAI,
  bulkCreateQuestions,
  getCompaniesForPractice
} = require('./question.controller');

const authMiddleware = require('../../shared/middlewares/auth.middleware');
const authorizeRoles = require('../../shared/middlewares/role.middleware');

const router = express.Router();

router.use(authMiddleware);

// Company Repository Actions
router.post('/', authorizeRoles('COMPANY'), createQuestion);
router.put('/:id', authorizeRoles('COMPANY'), updateQuestion);
router.patch('/:id/publish', authorizeRoles('COMPANY'), togglePublishQuestion);
router.post('/assign-to-interview', authorizeRoles('COMPANY'), assignQuestionToInterview);
router.post('/generate-ai', authorizeRoles('COMPANY'), generateQuestionsWithAI);
router.post('/bulk', authorizeRoles('COMPANY'), bulkCreateQuestions);
router.get('/library', authorizeRoles('COMPANY'), getQuestionLibrary);
router.delete('/:id', authorizeRoles('COMPANY'), deleteQuestion);

// Practice & Question Discovery (accessible to both Student and Company)
router.get('/practice', getPracticeQuestions);
router.get('/companies', getCompaniesForPractice);
router.get('/interview/:interviewId', getQuestionsByInterview);
router.get('/:id', getQuestionById);

module.exports = router;
