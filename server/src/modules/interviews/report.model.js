const mongoose = require('mongoose');

const interviewReportSchema = new mongoose.Schema({
  interviewId: { type: mongoose.Schema.Types.ObjectId, ref: 'Interview', unique: true, required: true, index: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  technicalScore: { type: Number, default: 0 },
  codingScore: { type: Number, default: 0 },
  communicationScore: { type: Number, default: 0 },
  integrityScore: { type: Number, default: 100 },
  overallScore: { type: Number, default: 0 },
  questionsAnswered: { type: Number, default: 0 },
  submissions: { type: Number, default: 0 },
  testsPassed: { type: Number, default: 0 },
  testsTotal: { type: Number, default: 0 },
  violations: { type: Number, default: 0 },
  strengths: [{ type: String }],
  improvements: [{ type: String }],
  aiSummary: { type: String, default: '' },
  aiSummaryStatus: { type: String, enum: ['COMPLETED', 'UNAVAILABLE'], default: 'UNAVAILABLE' },
  topicBreakdown: [{ topic: String, score: Number }],
  resumeSkills: [{ type: String }],
  systemDesignScore: { type: Number, default: null },
  generatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('InterviewReport', interviewReportSchema);
