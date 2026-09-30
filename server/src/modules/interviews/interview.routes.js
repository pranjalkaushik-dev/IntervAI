const express = require('express');
const router = express.Router();
const {
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
} = require('./interview.controller');
const authMiddleware = require('../../shared/middlewares/auth.middleware');
const authorizeRoles = require('../../shared/middlewares/role.middleware');

const multer = require('multer');
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

router.use(authMiddleware);

router.post('/', authorizeRoles('COMPANY'), createInterview);
router.get('/dashboard-summary', authorizeRoles('COMPANY'), getDashboardSummary);
router.get('/students', authorizeRoles('COMPANY'), getStudents);
router.get('/analytics', authorizeRoles('COMPANY'), getAnalytics);
router.get('/', getInterviews);
router.get('/room/:roomCode', getInterviewByRoomCode);
router.post('/join', joinInterviewByCode);
router.post('/mock', createMockInterview);
router.post('/p2p', createP2PInterview);
router.post('/:id/report/generate', generateReport);
router.get('/:id/report', getReport);
router.post('/:id/adaptive-turn', recordAdaptiveTurn);
router.post('/:id/text-submit', textSubmit);
router.get('/:id/answers', getAnswers);
router.get('/:id/answers/:answerId', getAnswerById);
router.put('/:id/notes', authorizeRoles('COMPANY'), updateNotes);
router.put('/:id/resume', saveResumeProfile);

// Resume upload & AI Generation routes
router.post('/:id/resume/upload', upload.single('resume'), uploadResumeFile);
router.get('/:id/resume', getResumeProfile);
router.post('/:id/resume/generate-questions', authorizeRoles('COMPANY'), generateResumeQuestions);

// System Design routes
router.post('/:id/system-design/state', saveSystemDesignState);
router.get('/:id/system-design/state', getSystemDesignState);
router.post('/:id/system-design/submit', submitSystemDesign);
router.get('/:id/system-design/evaluation', getSystemDesignEvaluation);

router.post('/:id/start', startInterview);
router.post('/:id/complete', completeInterview);
router.post('/:id/cancel', cancelInterview);
router.get('/:id', getInterviewById);

module.exports = router;
