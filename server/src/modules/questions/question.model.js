const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema(
  {
    interview: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Interview',
      required: true,
      index: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    source: {
      type: String,
      enum: ['MANUAL', 'AI', 'AI_GENERATED', 'FALLBACK'],
      default: 'MANUAL'
    },
    type: {
      type: String,
      enum: ['CODING', 'MCQ', 'TEXT', 'SYSTEM_DESIGN'],
      required: true
    },
    prompt: {
      type: String,
      required: [true, 'Question prompt is required'],
      trim: true
    },
    topic: {
      type: String,
      trim: true,
      default: ''
    },
    difficulty: {
      type: String,
      enum: ['EASY', 'MEDIUM', 'HARD'],
      default: 'MEDIUM'
    },
    order: {
      type: Number,
      required: true,
      min: 1
    },

    // MCQ fields
    options: {
      type: [String],
      default: undefined
    },
    correctOptionIndex: {
      type: Number,
      min: 0
    },

    // TEXT / interview evaluation fields
    expectedKeywords: {
      type: [String],
      default: []
    },

    // CODING fields
    constraints: {
      type: [String],
      default: undefined
    },
    examples: {
      type: [mongoose.Schema.Types.Mixed],
      default: undefined
    },
    testCases: {
      type: [mongoose.Schema.Types.Mixed],
      default: undefined
    },
    starterCode: {
      type: String,
      default: ''
    },
    driverCode: {
      type: String,
      default: ''
    },
    solution: {
      type: String,
      default: ''
    },
    referenceSolution: {
      type: String,
      default: ''
    },
    hiddenTests: {
      type: [mongoose.Schema.Types.Mixed],
      default: undefined
    },

    // SYSTEM_DESIGN fields
    initialCanvasState: {
      type: mongoose.Schema.Types.Mixed,
      default: undefined
    }
  },
  {
    timestamps: true
  }
);

questionSchema.index({ interview: 1, order: 1 }, { unique: true });

const Question = mongoose.model('Question', questionSchema);

module.exports = Question;
