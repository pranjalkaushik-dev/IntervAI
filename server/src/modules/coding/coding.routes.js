const express = require('express');
const router = express.Router();

const {
  runCode,
  submitCode,
  getSupportedLanguages,
  getSubmissionsByInterview
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

module.exports = router;
