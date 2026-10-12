const express = require('express');
const router = express.Router();

const {
  runCode,
  submitCode,
  getSupportedLanguages,
  getSubmissionsByInterview,
  runPracticeCode,
  submitPracticeCode,
  getPracticeSubmissions
} = require('./coding.controller');

const authMiddleware = require('../../shared/middlewares/auth.middleware');
const rateLimit = require('express-rate-limit');

const executionLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many code execution requests. Please try again shortly.' }
});

router.get('/languages', getSupportedLanguages);
router.post('/run', authMiddleware, executionLimiter, runCode);
router.post('/submit', authMiddleware, submitCode);
router.get(
  '/submissions/:interviewId',
  authMiddleware,
  getSubmissionsByInterview
);

// Isolated Practice Coding Endpoints
router.post('/practice/run', authMiddleware, executionLimiter, runPracticeCode);
router.post('/practice/submit', authMiddleware, submitPracticeCode);
router.get('/practice/submissions/:questionId', authMiddleware, getPracticeSubmissions);

module.exports = router;
