const mongoose = require('mongoose');

const participantSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  role: {
    type: String,
    enum: ['COMPANY', 'STUDENT'],
    required: true
  },
  inviteStatus: {
    type: String,
    enum: ['INVITED', 'JOINED', 'DECLINED', 'LEFT'],
    default: 'JOINED'
  },
  joinedAt: {
    type: Date,
    default: Date.now
  },
  leftAt: {
    type: Date,
    default: null
  }
});

const interviewSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Interview title is required'],
      trim: true,
      minlength: [3, 'Title must be at least 3 characters'],
      maxlength: [120, 'Title cannot exceed 120 characters']
    },
    description: {
      type: String,
      default: ''
    },
    roomCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    interviewType: {
      type: String,
      enum: ['CODING', 'TECHNICAL', 'HR', 'MIXED', 'SYSTEM_DESIGN'],
      default: 'TECHNICAL'
    },
    mockMode: {
      type: String,
      enum: ['DSA', 'CORE_CS', 'PROJECT', 'MIXED'],
      default: undefined
    },
    scheduledAt: {
      type: Date,
      default: Date.now
    },
    durationMinutes: {
      type: Number,
      default: 60,
      min: 15,
      max: 180
    },
    status: {
      type: String,
      enum: ['CREATED', 'WAITING', 'ACTIVE', 'COMPLETED', 'CANCELLED'],
      default: 'CREATED'
    },
    participants: [participantSchema],
    settings: {
      requireFullscreen: { type: Boolean, default: true },
      allowCopyPaste: { type: Boolean, default: false },
      enableCameraPrototype: { type: Boolean, default: false },
      maxViolations: { type: Number, default: 3 }
    },
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    companyNotes: { type: String, default: '' },
    studentResume: {
      fileName: { type: String, default: '' },
      fileType: { type: String, default: '' },
      text: { type: String, default: '' },
      name: { type: String, default: '' },
      email: { type: String, default: '' },
      skills: [{ type: String }],
      technologies: [{ type: String }],
      projects: [{ type: String }],
      education: [{ type: String }],
      experience: [{ type: String }],
      uploadedAt: { type: Date, default: null }
    },
    adaptiveTurns: [{
      question: String,
      candidateAnswer: String,
      technicalScore: Number,
      communicationScore: Number,
      summary: String,
      createdAt: { type: Date, default: Date.now }
    }]
  },
  {
    timestamps: true
  }
);

const Interview = mongoose.model('Interview', interviewSchema);

module.exports = Interview;
