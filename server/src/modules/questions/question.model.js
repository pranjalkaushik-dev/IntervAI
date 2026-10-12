const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema(
  {
    interview: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Interview',
      required: false,
      default: null,
      index: true
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    title: {
      type: String,
      trim: true,
      default: ''
    },
    isPublished: {
      type: Boolean,
      default: false,
      index: true
    },
    isRepositoryQuestion: {
      type: Boolean,
      default: true,
      index: true
    },
    tags: {
      type: [String],
      default: []
    },
    source: {
      type: String,
      enum: ['MANUAL', 'AI', 'AI_GENERATED', 'FALLBACK', 'CURATED'],
      default: 'MANUAL'
    },
    type: {
      type: String,
      enum: ['CODING', 'MCQ', 'TEXT', 'THEORY', 'SYSTEM_DESIGN'],
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
      default: 1,
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

questionSchema.index(
  { interview: 1, order: 1 },
  {
    unique: true,
    partialFilterExpression: { interview: { $type: 'objectId' } }
  }
);
questionSchema.index({ companyId: 1, createdAt: -1 });
questionSchema.index({ companyId: 1, isPublished: 1 });
questionSchema.index({ isPublished: 1, createdAt: -1 });

const Question = mongoose.model('Question', questionSchema);

module.exports = Question;
