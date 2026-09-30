const User = require('./auth.model');
const { generateToken } = require('../../shared/utils/jwt.utils');
const { sendSuccess, sendError } = require('../../shared/utils/response.utils');

/**
 * @desc    Register a new Student account
 * @route   POST /api/auth/register
 * @access  Public
 */
const registerUser = async (req, res) => {
  try {
    const { fullName, email, password, accountRole } = req.body;

    if (!fullName || !email || !password) {
      return sendError(res, 400, 'Please provide fullName, email, and password');
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return sendError(res, 400, 'User with this email already exists');
    }

    // Public registration must never allow a caller to self-assign a privileged role.
    // Company and Admin accounts should be provisioned by an authorized administrator.
    const user = await User.create({
      fullName: String(fullName).trim(),
      email: String(email).trim().toLowerCase(),
      passwordHash: password,
      accountRole: 'STUDENT'
    });

    const token = generateToken({ id: user._id, role: user.accountRole });

    return sendSuccess(res, 201, 'User registered successfully', {
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        accountRole: user.accountRole,
        avatarUrl: user.avatarUrl
      },
      token
    });
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

/**
 * @desc    Authenticate User & Get Token
 * @route   POST /api/auth/login
 * @access  Public
 */
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return sendError(res, 400, 'Please provide email and password');
    }

    const user = await User.findOne({ email: String(email).trim().toLowerCase() });
    if (!user) {
      return sendError(res, 401, 'Invalid credentials');
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return sendError(res, 401, 'Invalid credentials');
    }

    if (!user.isActive) {
      return sendError(res, 403, 'Account is deactivated. Contact admin.');
    }

    const token = generateToken({ id: user._id, role: user.accountRole });

    return sendSuccess(res, 200, 'Login successful', {
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        accountRole: user.accountRole,
        avatarUrl: user.avatarUrl
      },
      token
    });
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

/**
 * @desc    Get current authenticated user profile
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = async (req, res) => {
  try {
    return sendSuccess(res, 200, 'Profile retrieved successfully', {
      user: {
        id: req.user._id,
        fullName: req.user.fullName,
        email: req.user.email,
        accountRole: req.user.accountRole,
        avatarUrl: req.user.avatarUrl,
        createdAt: req.user.createdAt
      }
    });
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

module.exports = {
  registerUser,
  loginUser,
  getMe
};
