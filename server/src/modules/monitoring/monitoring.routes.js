const express = require('express');
const router = express.Router();
const {
  logViolation,
  getInterviewViolations,
  generateDualCamToken
} = require('./monitoring.controller');
const authMiddleware = require('../../shared/middlewares/auth.middleware');

router.use(authMiddleware);

router.post('/violations', logViolation);
router.get('/violations/:interviewId', getInterviewViolations);
router.post('/dual-camera/token', generateDualCamToken);

module.exports = router;
