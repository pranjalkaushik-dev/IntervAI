const express = require('express');
const {
  createQuestion,
  getQuestionsByInterview,
  getQuestionById,
  deleteQuestion,
  getQuestionLibrary,
  generateQuestionsWithAI,
  bulkCreateQuestions
} = require('./question.controller');

const authMiddleware = require('../../shared/middlewares/auth.middleware');
const authorizeRoles = require('../../shared/middlewares/role.middleware');

const router = express.Router();

router.use(authMiddleware);

router.post('/', authorizeRoles('COMPANY'), createQuestion);
router.post('/generate-ai', authorizeRoles('COMPANY'), generateQuestionsWithAI);
router.post('/bulk', authorizeRoles('COMPANY'), bulkCreateQuestions);
router.get('/library', authorizeRoles('COMPANY'), getQuestionLibrary);
router.get('/interview/:interviewId', getQuestionsByInterview);
router.get('/:id', getQuestionById);
router.delete('/:id', authorizeRoles('COMPANY'), deleteQuestion);

module.exports = router;
