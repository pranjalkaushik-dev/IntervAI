const express = require('express');
const router = express.Router();
const { registerUser, loginUser, getMe } = require('./auth.controller');
const authMiddleware = require('../../shared/middlewares/auth.middleware');

const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many login attempts. Please try again later.'
    });
  }
});

router.post('/register', registerUser);
router.post('/login', loginLimiter, loginUser);
router.get('/me', authMiddleware, getMe);

module.exports = router;
