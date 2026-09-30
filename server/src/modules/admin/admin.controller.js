const User = require('../auth/auth.model');
const Interview = require('../interviews/interview.model');
const Question = require('../questions/question.model');
const ViolationLog = require('../monitoring/violation.model');
const { sendSuccess, sendError } = require('../../shared/utils/response.utils');

const InterviewReport = require('../interviews/report.model');
const mongoose = require('mongoose');

const listUsers = async (req, res) => {
  try {
    const users = await User.find().select('-passwordHash').sort({ createdAt: -1 }).lean();
    return sendSuccess(res, 200, 'Users retrieved successfully', { users });
  } catch (e) { return sendError(res, 500, e.message); }
};

const updateUser = async (req, res) => {
  try {
    const { role, isActive } = req.body;
    const allowed = ['STUDENT', 'COMPANY', 'ADMIN'];
    const update = {};
    if (role !== undefined) {
      if (!allowed.includes(role)) return sendError(res, 400, 'Invalid role');
      update.accountRole = role;
    }
    if (isActive !== undefined) update.isActive = Boolean(isActive);
    const user = await User.findByIdAndUpdate(req.params.id, update, { new: true }).select('-passwordHash').lean();
    if (!user) return sendError(res, 404, 'User not found');
    return sendSuccess(res, 200, 'User updated successfully', { user });
  } catch (e) { return sendError(res, 500, e.message); }
};

const createManagedUser = async (req, res) => {
  try {
    const { fullName, email, password, accountRole } = req.body;
    if (!fullName || !email || !password || !['STUDENT', 'COMPANY', 'ADMIN'].includes(accountRole)) {
      return sendError(res, 400, 'fullName, email, password and a valid accountRole are required');
    }
    if (await User.findOne({ email: String(email).trim().toLowerCase() })) return sendError(res, 400, 'User already exists');
    const user = await User.create({ fullName, email: String(email).trim().toLowerCase(), passwordHash: password, accountRole });
    const safe = user.toObject(); delete safe.passwordHash;
    return sendSuccess(res, 201, 'User created successfully', { user: safe });
  } catch (e) { return sendError(res, 500, e.message); }
};

const getAnalytics = async (req, res) => {
  try {
    const [students, companies, admins, interviews, completed, live, questions, violations] = await Promise.all([
      User.countDocuments({ accountRole: 'STUDENT' }),
      User.countDocuments({ accountRole: 'COMPANY' }),
      User.countDocuments({ accountRole: 'ADMIN' }),
      Interview.countDocuments(),
      Interview.countDocuments({ status: 'COMPLETED' }),
      Interview.countDocuments({ status: 'ACTIVE' }),
      Question.countDocuments(),
      ViolationLog.countDocuments()
    ]);
    return sendSuccess(res, 200, 'Platform analytics retrieved successfully', {
      analytics: { students, companies, admins, interviews, completedInterviews: completed, liveInterviews: live, questions, violations }
    });
  } catch (e) { return sendError(res, 500, e.message); }
};

const listCompanies = async (req, res) => {
  try {
    const companies = await User.find({ accountRole: 'COMPANY' }).select('-passwordHash').sort({ createdAt: -1 }).lean();
    return sendSuccess(res, 200, 'Companies retrieved successfully', { companies });
  } catch (e) { return sendError(res, 500, e.message); }
};

const listReports = async (req, res) => {
  try {
    const reports = await InterviewReport.find()
      .populate('interviewId', 'title roomCode status createdBy')
      .populate('studentId', 'fullName email')
      .sort({ generatedAt: -1 })
      .limit(200)
      .lean();
    return sendSuccess(res, 200, 'Reports retrieved successfully', { reports, count: reports.length });
  } catch (e) { return sendError(res, 500, e.message); }
};

const getSystemStatus = async (req, res) => {
  const aiUrl = process.env.AI_MONITORING_URL || 'http://localhost:5050';
  let ai = { status: 'UNAVAILABLE' };
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);
    const response = await fetch(`${aiUrl}/health`, { signal: controller.signal });
    clearTimeout(timeout);
    ai = await response.json();
  } catch (e) { ai = { status: 'UNAVAILABLE', message: e.message }; }
  return sendSuccess(res, 200, 'System status retrieved', {
    system: {
      nodeVersion: process.version,
      uptimeSeconds: Math.round(process.uptime()),
      environment: process.env.NODE_ENV || 'development',
      database: mongoose.connection.readyState === 1 ? 'CONNECTED' : 'DISCONNECTED',
      aiService: ai,
      timestamp: new Date().toISOString()
    }
  });
};

module.exports = { listUsers, updateUser, createManagedUser, getAnalytics, listCompanies, listReports, getSystemStatus };
