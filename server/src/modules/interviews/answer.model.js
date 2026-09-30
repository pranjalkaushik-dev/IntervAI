const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema(
  {
    interview: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Interview',
      required: true,
      index: true
    },
    question: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question',
      default: null
    },
    participant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    answer: {
      type: String,
      required: true
    },
    submittedAt: {
      type: Date,
      default: Date.now
    },
    evaluationStatus: {
      type: String,
      enum: ['PENDING', 'COMPLETED', 'FAILED'],
      default: 'PENDING',
      index: true
    },
    technicalScore: { type: Number, default: 0 },
    communicationScore: { type: Number, default: 0 },
    summary: { type: String, default: '' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Answer', answerSchema);
