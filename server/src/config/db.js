const mongoose = require('mongoose');
const User = require('../modules/auth/auth.model');
const Interview = require('../modules/interviews/interview.model');
const Submission = require('../modules/coding/submission.model');
const ViolationLog = require('../modules/monitoring/violation.model');
const InterviewReport = require('../modules/interviews/report.model');
const SystemDesign = require('../modules/interviews/systemDesign.model');
const migrateQuestions = require('./migrate-questions');

const migrateLegacyData = async () => {
  await User.updateMany({ accountRole: 'CANDIDATE' }, { $set: { accountRole: 'STUDENT' } });
  await User.updateMany({ accountRole: 'INTERVIEWER' }, { $set: { accountRole: 'COMPANY' } });
  await Interview.updateMany({ 'participants.role': 'CANDIDATE' }, { $set: { 'participants.$[p].role': 'STUDENT' } }, { arrayFilters: [{ 'p.role': 'CANDIDATE' }] });
  await Interview.updateMany({ 'participants.role': 'INTERVIEWER' }, { $set: { 'participants.$[p].role': 'COMPANY' } }, { arrayFilters: [{ 'p.role': 'INTERVIEWER' }] });
  for (const [legacy, canonical] of Object.entries({ DRAFT: 'CREATED', SCHEDULED: 'CREATED', LIVE: 'ACTIVE' })) {
    await Interview.updateMany({ status: legacy }, { $set: { status: canonical } });
  }
  await Interview.updateMany({ interviewerNotes: { $exists: true }, companyNotes: { $exists: false } }, { $rename: { interviewerNotes: 'companyNotes' } });
  await Interview.updateMany({ candidateResume: { $exists: true }, studentResume: { $exists: false } }, { $rename: { candidateResume: 'studentResume' } });

  for (const Model of [Submission, ViolationLog, InterviewReport, SystemDesign]) {
    await Model.updateMany(
      { candidateId: { $exists: true }, studentId: { $exists: false } },
      { $rename: { candidateId: 'studentId' } },
    );
    await Model.updateMany(
      { candidateId: { $exists: true }, studentId: { $exists: true } },
      { $unset: { candidateId: 1 } },
    );
  }
};

const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/intervai';
  try {
    const conn = await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
    console.log(`[Database] MongoDB Connected Successfully: ${conn.connection.host}`);
    try {
      await migrateLegacyData();
      await migrateQuestions();
      console.log('[Database] Legacy roles/statuses/student identifiers normalized.');
    } catch (migrationError) {
      console.warn(`[Database Warning] Legacy-data migration skipped: ${migrationError.message}`);
    }
  } catch (error) {
    console.warn(`[Database Warning] Primary MongoDB connection failed (${error.message}). Attempting local fallback...`);
    try {
      const fallbackConn = await mongoose.connect('mongodb://127.0.0.1:27017/intervai', { serverSelectionTimeoutMS: 3000 });
      console.log(`[Database] Local MongoDB Connected Successfully: ${fallbackConn.connection.host}`);
      await migrateLegacyData();
      await migrateQuestions();
    } catch (fallbackError) {
      console.warn(`[Database Warning] Local MongoDB fallback failed: ${fallbackError.message}`);
      console.warn('[Database Warning] Server running in offline/in-memory mode for Socket.IO and live collaboration.');
    }
  }
};

module.exports = connectDB;
