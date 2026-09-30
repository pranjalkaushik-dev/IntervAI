const mongoose = require('mongoose');

const systemDesignSchema = new mongoose.Schema(
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
      required: true
    },
    canvasState: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    nodes: {
      type: [mongoose.Schema.Types.Mixed],
      default: []
    },
    edges: {
      type: [mongoose.Schema.Types.Mixed],
      default: []
    },
    diagramNotes: {
      type: String,
      default: ''
    },
    aiEvaluation: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    isSubmitted: {
      type: Boolean,
      default: false
    },
    submittedAt: {
      type: Date
    }
  },
  { timestamps: true }
);

systemDesignSchema.index({ interviewId: 1, studentId: 1 });

module.exports = mongoose.model('SystemDesign', systemDesignSchema);
