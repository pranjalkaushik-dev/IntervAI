const mongoose = require('mongoose');

const practiceTestResultSchema = new mongoose.Schema({
  testCaseId: { type: String, default: null },
  input: { type: String, default: '' },
  expectedOutput: { type: String, default: '' },
  actualOutput: { type: String, default: '' },
  passed: { type: Boolean, required: true },
  executionTime: { type: String, default: '0.0' },
  memory: { type: Number, default: 0 },
  error: { type: String, default: '' }
});

const practiceSubmissionSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question',
      required: true,
      index: true
    },
    sourceCode: {
      type: String,
      required: true
    },
    languageId: {
      type: Number,
      required: true
    },
    languageName: {
      type: String,
      default: 'javascript'
    },
    status: {
      type: String,
      enum: ['PASSED', 'FAILED', 'PARTIAL', 'ERROR'],
      default: 'PASSED'
    },
    score: {
      type: Number,
      default: 100,
      min: 0,
      max: 100
    },
    testResults: [practiceTestResultSchema],
    executionTime: {
      type: String,
      default: '0.0'
    },
    memory: {
      type: Number,
      default: 0
    },
    submittedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

practiceSubmissionSchema.index({ studentId: 1, questionId: 1, createdAt: -1 });

const PracticeSubmission = mongoose.model('PracticeSubmission', practiceSubmissionSchema);

module.exports = PracticeSubmission;
