const mongoose = require('mongoose');

const testResultSchema = new mongoose.Schema({
  testCaseId: { type: String, default: null },
  input: { type: String, default: '' },
  expectedOutput: { type: String, default: '' },
  actualOutput: { type: String, default: '' },
  passed: { type: Boolean, required: true },
  executionTime: { type: String, default: '0.0' },
  memory: { type: Number, default: 0 },
  error: { type: String, default: '' }
});

const submissionSchema = new mongoose.Schema(
  {
    interviewId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Interview',
      required: true,
      index: true
    },
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question',
      default: null
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
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
    testResults: [testResultSchema],
    aiFeedback: {
      timeComplexity: { type: String, default: null },
      spaceComplexity: { type: String, default: null },
      codeQualityScore: { type: Number, default: null },
      summary: { type: String, default: null },
      suggestions: [{ type: String }]
    },
    aiFeedbackStatus: {
      type: String,
      enum: ['COMPLETED', 'UNAVAILABLE'],
      default: 'UNAVAILABLE'
    },
    submittedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);


const Submission = mongoose.model('Submission', submissionSchema);

module.exports = Submission;
