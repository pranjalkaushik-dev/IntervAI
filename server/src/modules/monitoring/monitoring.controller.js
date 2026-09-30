const ViolationLog = require('./violation.model');
const Interview = require('../interviews/interview.model');
const { generateToken, verifyToken } = require('../../shared/utils/jwt.utils');
const { sendSuccess, sendError } = require('../../shared/utils/response.utils');

/**
 * @desc    Log a monitoring/CV violation (REST endpoint)
 * @route   POST /api/monitoring/violations
 * @access  Private
 */
const logViolation = async (req, res) => {
  try {
    const { interviewId, violationType, metadata, severity } = req.body;

    if (!interviewId || !violationType) {
      return sendError(res, 400, 'interviewId and violationType are required');
    }

    // Authenticated student ID from req.user (Never trust client body studentId)
    const studentId = req.user._id;

    // Verify interview room exists
    const interview = await Interview.findById(interviewId);
    if (!interview) {
      return sendError(res, 404, 'Interview session not found');
    }

    // Save violation log to MongoDB
    const violationLog = await ViolationLog.create({
      interviewId,
      studentId,
      violationType,
      metadata: metadata || {},
      severity: severity || 'MEDIUM'
    });

    // Count total violations for student in this interview
    const totalViolations = await ViolationLog.countDocuments({
      interviewId,
      studentId
    });

    return sendSuccess(res, 201, 'Violation logged successfully', {
      violationLog,
      totalViolations
    });
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

/**
 * @desc    Get violation logs for an interview session
 * @route   GET /api/monitoring/violations/:interviewId
 * @access  Private
 */
const getInterviewViolations = async (req, res) => {
  try {
    const { interviewId } = req.params;

    const violations = await ViolationLog.find({ interviewId })
      .populate('studentId', 'fullName email avatarUrl')
      .sort({ timestamp: -1 });

    return sendSuccess(res, 200, 'Violation logs retrieved', {
      count: violations.length,
      violations
    });
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

/**
 * @desc    Generate a short-lived token (15 mins) for Laptop <-> Phone Dual Camera pairing
 * @route   POST /api/monitoring/dual-camera/token
 * @access  Private
 */
const generateDualCamToken = async (req, res) => {
  try {
    const { interviewId } = req.body;

    if (!interviewId) {
      return sendError(res, 400, 'interviewId is required');
    }

    // Generate short-lived pairing token (15 min expiration)
    const interview = await Interview.findOne({
      _id: interviewId,
      $or: [{ createdBy: req.user._id }, { 'participants.user': req.user._id }]
    }).select('_id').lean();

    if (!interview) {
      return sendError(res, 403, 'You are not authorized to pair a secondary camera for this interview.');
    }

    const pairingToken = generateToken({
      interviewId,
      studentId: req.user._id,
      deviceType: 'SECONDARY_CAM',
      type: 'DUAL_CAM_PAIRING'
    }, { expiresIn: '15m' });

    const pairingBaseUrl = process.env.PUBLIC_CLIENT_URL || process.env.CLIENT_URL || 'http://localhost:5179';
    const pairingUrl = `${pairingBaseUrl.replace(/\/$/, '')}/dual-camera?token=${encodeURIComponent(pairingToken)}&interview=${encodeURIComponent(interviewId)}`;

    return sendSuccess(res, 200, 'Dual-camera pairing token generated', {
      pairingToken,
      pairingUrl,
      expiresInMinutes: 15
    });
  } catch (error) {
    return sendError(res, 500, error.message);
  }
};

module.exports = {
  logViolation,
  getInterviewViolations,
  generateDualCamToken
};
