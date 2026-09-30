const mongoose = require('mongoose');

const violationLogSchema = new mongoose.Schema(
  {
    interviewId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Interview',
      required: true,
      index: true
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    violationType: {
      type: String,
      enum: [
        'TAB_HIDDEN',
        'FULLSCREEN_EXIT',
        'COPY',
        'PASTE',
        'CAMERA_OFF',
        'MIC_OFF',
        'NO_FACE',
        'MULTIPLE_FACES',
        'LOOKING_AWAY',
        'CANDIDATE_ABSENT',
        'MULTIPLE_PEOPLE',
        'PROHIBITED_OBJECT',
        'TAB_SWITCH_DETECTED',
        'OTHER'
      ],
      required: true
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    severity: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      default: 'MEDIUM'
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

const ViolationLog = mongoose.model('ViolationLog', violationLogSchema);

module.exports = ViolationLog;
