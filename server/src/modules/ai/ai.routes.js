const express = require('express');
const router = express.Router();

const {
  interviewAssistant
} = require('./ai.controller');

const authMiddleware = require('../../shared/middlewares/auth.middleware');

router.post(
  '/interview-assistant',
  authMiddleware,
  interviewAssistant
);

module.exports = router;
