const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const connectDB = require('./config/db');
const errorHandler = require('./shared/middlewares/error.middleware');
const { verifyToken } = require('./shared/utils/jwt.utils');
const mongoose = require('mongoose');
const User = require('./modules/auth/auth.model');
const ViolationLog = require('./modules/monitoring/violation.model');

// Routes
const authRoutes = require('./modules/auth/auth.routes');
const interviewRoutes = require('./modules/interviews/interview.routes');
const monitoringRoutes = require('./modules/monitoring/monitoring.routes');
const codingRoutes = require('./modules/coding/coding.routes');
const aiRoutes = require('./modules/ai/ai.routes');
const questionRoutes = require('./modules/questions/question.routes');
const adminRoutes = require('./modules/admin/admin.routes');

// Connect to MongoDB
connectDB();

const app = express();
app.set('trust proxy', 1);
const server = http.createServer(app);

// Enable CORS. Keep credentials enabled only with explicit allowed origins.
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5179')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const isPrivateLanHost = (hostname) =>
  hostname === 'localhost' ||
  hostname === '127.0.0.1' ||
  /^192\.168\.\d+\.\d+$/.test(hostname) ||
  /^10\.\d+\.\d+\.\d+$/.test(hostname) ||
  /^172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+$/.test(hostname);

const isAllowedOrigin = (origin) => {
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;
  if (process.env.ALLOW_LAN_ORIGINS === 'false') return false;
  try {
    const url = new URL(origin);
    if (isPrivateLanHost(url.hostname)) return true;
    if (
      url.hostname.endsWith('.serveousercontent.com') ||
      url.hostname.endsWith('.loca.lt') ||
      url.hostname.endsWith('.ngrok-free.app') ||
      url.hostname.endsWith('.pinggy.net') ||
      url.hostname.endsWith('.pinggy-free.link')
    ) {
      return true;
    }
    return false;
  } catch (_) {
    return false;
  }
};

const corsOptions = {
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) return callback(null, true);
    return callback(new Error('Origin not allowed by CORS'));
  },
  credentials: true
};

app.use(cors(corsOptions));

// Express Body Parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check API
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'Collaborative Technical Interview Backend',
    team: 'Batch B-2 (NIE Mysuru)'
  });
});

// Mount REST Routes
app.use('/api/auth', authRoutes);
app.use('/api/interviews', interviewRoutes);
app.use('/api/monitoring', monitoringRoutes);
app.use('/api/coding', codingRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/admin', adminRoutes);

// Socket.IO Setup
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) return callback(null, true);
      return callback(new Error('Origin not allowed by CORS'));
    },
    methods: ['GET', 'POST'],
    credentials: true
  }
});
app.set('io', io);

// In-memory room state for real-time live code syncing
const roomCodeMap = new Map();
const roomUsersMap = new Map();
const roomSystemDesignMap = new Map();

// Token-based coding access management (roomId -> { holderUserId, holderUserName, holderSocketId })
const roomTokenMap = new Map();

// Socket.IO Authentication Middleware (Secures all socket events)
io.use(async (socket, next) => {
  try {
    const pairingToken = socket.handshake.auth?.pairingToken;
    if (pairingToken) {
      console.log('[Socket.IO] Authenticating dual camera pairing token (len:', pairingToken.length, ')');
      const decoded = verifyToken(pairingToken);
      const pairedStudentId = decoded?.studentId || decoded?.candidateId;
      if (decoded?.type !== 'DUAL_CAM_PAIRING' || !pairedStudentId || !decoded?.interviewId) {
        return next(new Error('Authentication error: Invalid dual-camera pairing token'));
      }
      socket.user = { _id: pairedStudentId, accountRole: 'SECONDARY_CAM', fullName: 'Secondary Camera' };
      socket.isDualCam = true;
      socket.pairingInterviewId = String(decoded.interviewId);
      console.log('[Socket.IO] Dual camera authenticated successfully for interview:', decoded.interviewId);
      return next();
    }

    const token =
      socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];

    if (!token) {
      return next(new Error('Authentication required'));
    }

    const decoded = verifyToken(token);

    if (!decoded?.id || !mongoose.Types.ObjectId.isValid(decoded.id)) {
      return next(new Error('Authentication error: Invalid user id'));
    }

    let user;
    try {
      user = await User.findById(decoded.id).select('-passwordHash');
    } catch (err) {
      console.error('[Socket.IO] User lookup failed:', err.message);
      return next(new Error('Authentication error: User verification unavailable'));
    }

    if (!user || !user.isActive) {
      return next(new Error('Authentication error: User not found or inactive'));
    }

    socket.user = user;
    next();
  } catch (err) {
    console.warn('[Socket.IO] Auth verification error:', err.message);
    next(new Error(`Authentication error: ${err.message}`));
  }
});

// Socket.IO Gateway & Event Handlers
io.on('connection', (socket) => {
  console.log(`[Socket.IO] Connected User: ${socket.user?.fullName || 'SecondaryCam'} (${socket.id})`);

  // 1. Join Interview Room
  socket.on('join-room', async ({ roomId, interviewId }) => {
    if (!roomId || !socket.user?._id) return;
    try {
      const interview = await require('./modules/interviews/interview.model').findOne({ roomCode: String(roomId).toUpperCase() }).select('_id createdBy participants').lean();
      if (!interview || (interviewId && String(interview._id) !== String(interviewId))) { socket.emit('room:error', { message: 'Interview room not found.' }); return; }
      const isOwner = String(interview.createdBy) === String(socket.user._id);
      const isParticipant = (interview.participants || []).some((p) => String(p.user) === String(socket.user._id));
      if (!isOwner && !isParticipant && socket.user.accountRole !== 'ADMIN') { socket.emit('room:error', { message: 'You are not authorized to join this interview room.' }); return; }
    } catch (_) { socket.emit('room:error', { message: 'Unable to validate interview room access.' }); return; }
    socket.join(roomId);
    if (interviewId) socket.join(String(interviewId));
    socket.currentRoom = roomId;

    // Track active room participants
    if (!roomUsersMap.has(roomId)) {
      roomUsersMap.set(roomId, new Map());
    }
    roomUsersMap.get(roomId).set(socket.id, {
      socketId: socket.id,
      userId: socket.user?._id,
      userName: socket.user?.fullName,
      role: socket.user?.accountRole || 'STUDENT'
    });

    const participants = Array.from(roomUsersMap.get(roomId).values());

    console.log(`[Socket.IO] ${socket.user?.fullName} (${socket.id}) joined room: ${roomId}`);
    
    // If no token holder is set for this room yet, default to first joined user or company
    if (!roomTokenMap.has(roomId) && socket.user?._id) {
      roomTokenMap.set(roomId, {
        holderUserId: String(socket.user._id),
        holderUserName: socket.user.fullName || 'Participant',
        holderSocketId: socket.id
      });
    }

    // Broadcast to room members
    socket.to(roomId).emit('user-joined', {
      socketId: socket.id,
      userId: socket.user?._id,
      userName: socket.user?.fullName,
      role: socket.user?.accountRole || 'STUDENT',
      participants
    });

    // Send the joining user current room state (latest synced code, system design, participants & coding token)
    const existingCode = roomCodeMap.get(roomId);
    const existingSystemDesign = roomSystemDesignMap.get(roomId);
    const tokenState = roomTokenMap.get(roomId) || null;

    socket.emit('room-state', {
      code: existingCode !== undefined ? existingCode : null,
      systemDesign: existingSystemDesign !== undefined ? existingSystemDesign : null,
      participants,
      token: tokenState
    });
  });

  // 2. Code Synchronization with Server-Side Token Authorization
  socket.on('code-change', ({ roomId, code }) => {
    if (!roomId || !socket.rooms.has(roomId) || typeof code !== 'string') return;
    const currentToken = roomTokenMap.get(roomId);
    const userId = String(socket.user?._id || '');

    // Server-side authorization check: Reject code-change if user is not token holder
    if (currentToken && currentToken.holderUserId && currentToken.holderUserId !== userId) {
      socket.emit('coding:token:rejected', { message: 'You currently have read-only access.' });
      return;
    }

    roomCodeMap.set(roomId, code);
    socket.to(roomId).emit('code-update', { code });
  });

  // Token-Based Coding Control Socket Handlers
  socket.on('coding:token:request', ({ roomId }) => {
    if (!roomId || !socket.rooms.has(roomId)) return;
    const currentToken = roomTokenMap.get(roomId);
    const requester = {
      userId: String(socket.user?._id || ''),
      userName: socket.user?.fullName || 'Participant',
      socketId: socket.id
    };

    io.to(roomId).emit('coding:token:requested', { requester, currentToken });
  });

  socket.on('coding:token:grant', ({ roomId, targetUserId, targetUserName, targetSocketId }) => {
    if (!roomId || !targetUserId) return;
    if (!socket.rooms.has(roomId)) {
      socket.emit('coding:token:rejected', { message: 'You are not a member of this room.' });
      return;
    }
    const currentToken = roomTokenMap.get(roomId);
    const userId = String(socket.user?._id || '');
    const isCompanyUser = socket.user?.accountRole === 'COMPANY';
    const isCurrentHolder = currentToken?.holderUserId === userId;
    if (!isCompanyUser && !isCurrentHolder) {
      socket.emit('coding:token:rejected', { message: 'Only the company or current token holder can grant coding access.' });
      return;
    }
    const participants = roomUsersMap.get(roomId);
    const targetIsMember = participants && Array.from(participants.values()).some((participant) => String(participant.userId) === String(targetUserId));
    if (!targetIsMember) {
      socket.emit('coding:token:rejected', { message: 'The selected participant is not in this room.' });
      return;
    }
    const newToken = {
      holderUserId: String(targetUserId),
      holderUserName: targetUserName || 'Participant',
      holderSocketId: targetSocketId || null
    };
    roomTokenMap.set(roomId, newToken);
    io.to(roomId).emit('coding:token:update', { token: newToken });
  });

  socket.on('coding:token:release', ({ roomId }) => {
    if (!roomId) return;
    const currentToken = roomTokenMap.get(roomId);
    const userId = String(socket.user?._id || '');
    if (currentToken && currentToken.holderUserId === userId) {
      roomTokenMap.delete(roomId);
      io.to(roomId).emit('coding:token:update', { token: null });
    }
  });

  // System Design Real-time Architecture Collaboration
  socket.on('system-design:change', ({ roomId, nodes, edges, diagramNotes, canvasState }) => {
    if (!roomId) return;
    const statePayload = { nodes: nodes || [], edges: edges || [], diagramNotes: diagramNotes || '', canvasState: canvasState || {} };
    roomSystemDesignMap.set(roomId, statePayload);
    socket.to(roomId).emit('system-design:update', statePayload);
  });

  socket.on('question:change', ({ roomId, questionIndex }) => {
    if (!roomId || !Number.isInteger(questionIndex)) return;
    socket.to(roomId).emit('question:change', { questionIndex });
  });

  // Real-time interview chat
  socket.on('chat:message', ({ roomId, text }) => {
    if (!roomId || !socket.rooms.has(roomId) || !String(text || '').trim()) return;
    io.to(roomId).emit('chat:message', {
      id: `${socket.id}-${Date.now()}`,
      userId: socket.user?._id,
      sender: socket.user?.fullName || 'Participant',
      role: socket.user?.accountRole || 'STUDENT',
      text: String(text).trim(),
      timestamp: new Date().toISOString()
    });
  });

  // 3. SECURE CV & Monitoring Violations (Rishav's module)
  socket.on('monitoring:violation', async ({ interviewId, violationType, metadata, severity }) => {
    try {
      const studentId = socket.user?._id;

      // Monitoring records must always belong to a real authenticated User.
      // Never persist socket IDs, guest IDs, or other client-supplied identifiers.
      if (!studentId || !mongoose.Types.ObjectId.isValid(studentId)) {
        console.warn(`[Socket Violation Ignored] Invalid authenticated student id for socket ${socket.id}`);
        socket.emit('error-event', {
          message: 'Proctoring violation was not persisted because the student session is not authenticated.'
        });
        return;
      }

      if (!mongoose.Types.ObjectId.isValid(interviewId)) {
        socket.emit('error-event', { message: 'Invalid interview ID for monitoring event' });
        return;
      }
      const Interview = require('./modules/interviews/interview.model');
      const interview = await Interview.findById(interviewId)
        .select('roomCode status participants')
        .lean();
      const isStudentParticipant = interview?.participants?.some(
        (participant) =>
          String(participant.user) === String(studentId) &&
          participant.role === 'STUDENT'
      );
      if (
        socket.user.accountRole !== 'STUDENT' ||
        !isStudentParticipant ||
        interview.status !== 'ACTIVE' ||
        socket.currentRoom !== interview.roomCode ||
        !socket.rooms.has(interview.roomCode)
      ) {
        socket.emit('error-event', {
          message: 'Monitoring event was not accepted for this interview.'
        });
        return;
      }
      const normalizedViolationType = ({
        TAB_SWITCH_DETECTED: 'TAB_HIDDEN',
        NO_FACE: 'NO_FACE',
        CANDIDATE_ABSENT: 'CANDIDATE_ABSENT',
        MULTIPLE_FACES: 'MULTIPLE_FACES',
        MULTIPLE_PEOPLE: 'MULTIPLE_PEOPLE',
        PROHIBITED_OBJECT: 'PROHIBITED_OBJECT',
        PHONE_DETECTED: 'PROHIBITED_OBJECT',
        LOOKING_AWAY: 'LOOKING_AWAY',
        FULLSCREEN_EXIT: 'FULLSCREEN_EXIT',
        COPY: 'COPY',
        PASTE: 'PASTE',
        CAMERA_OFF: 'CAMERA_OFF',
        MIC_OFF: 'MIC_OFF'
      })[violationType] || 'OTHER';

      let violationLog;
      let totalViolations;
      try {
        violationLog = await ViolationLog.create({
          interviewId,
          studentId,
          violationType: normalizedViolationType,
          metadata: metadata || {},
          severity: severity || 'MEDIUM'
        });
        totalViolations = await ViolationLog.countDocuments({
          interviewId,
          studentId
        });
      } catch (dbErr) {
        console.error('[Socket Violation Persistence Error]:', dbErr.message);
        socket.emit('error-event', {
          message: 'Proctoring violation could not be saved. Please check the database connection.'
        });
        return;
      }

      io.to(interview.roomCode).emit('violation-alert', {
        logId: violationLog._id,
        studentId,
        studentName: socket.user.fullName,
        violationType: normalizedViolationType,
        metadata,
        severity: violationLog.severity,
        totalViolations,
        timestamp: violationLog.timestamp
      });
    } catch (err) {
      console.error('[Socket Violation Error]:', err.message);
      socket.emit('error-event', { message: 'Failed to record violation log' });
    }
  });

  // 4. Primary interview WebRTC signaling (camera + optional screen share)
  socket.on('webrtc:offer', ({ roomId, sdp, media }) => {
    if (!roomId || !sdp || !socket.rooms.has(roomId)) return;
    socket.to(roomId).emit('webrtc:offer', { sdp, media: media || {}, senderSocketId: socket.id, senderRole: socket.user?.accountRole || 'STUDENT' });
  });
  socket.on('webrtc:answer', ({ targetSocketId, sdp, media }) => {
    if (!targetSocketId || !sdp) return;
    io.to(targetSocketId).emit('webrtc:answer', { sdp, media: media || {}, senderSocketId: socket.id });
  });
  socket.on('webrtc:ice-candidate', ({ targetSocketId, roomId, candidate }) => {
    if (!candidate) return;
    if (targetSocketId) io.to(targetSocketId).emit('webrtc:ice-candidate', { candidate, senderSocketId: socket.id });
    else if (roomId && socket.rooms.has(roomId)) socket.to(roomId).emit('webrtc:ice-candidate', { candidate, senderSocketId: socket.id });
  });
  socket.on('webrtc:request-offer', ({ roomId }) => {
    if (!roomId || !socket.rooms.has(roomId)) return;
    socket.to(roomId).emit('webrtc:request-offer', { requesterSocketId: socket.id });
  });
  socket.on('webrtc:screen-share', ({ roomId, sharing }) => {
    if (!roomId || !socket.rooms.has(roomId)) return;
    socket.to(roomId).emit('webrtc:screen-share', { sharing: Boolean(sharing), senderSocketId: socket.id });
  });

  // 4. Laptop <-> Phone Dual-Camera WebRTC Signaling (Rishav's module)
  socket.on('dual-camera:join', ({ interviewId }) => {
    if (!interviewId || (socket.isDualCam && socket.pairingInterviewId !== String(interviewId))) return;
    socket.join(`dual-cam-${interviewId}`);
    console.log(`[Dual-Cam Socket] Secondary device joined dual-cam-${interviewId}`);
    socket.to(interviewId).emit('dual-camera:joined', {
      socketId: socket.id,
      studentId: socket.user?._id,
      deviceType: 'SECONDARY_CAM'
    });
  });

  socket.on('dual-camera:offer', ({ interviewId, sdp, targetSocketId }) => {
    if (!interviewId || !sdp || (socket.isDualCam && socket.pairingInterviewId !== String(interviewId))) return;
    if (targetSocketId) {
      io.to(targetSocketId).emit('dual-camera:offer', { sdp, senderSocketId: socket.id });
    } else {
      socket.to(interviewId).emit('dual-camera:offer', { sdp, senderSocketId: socket.id });
    }
  });

  socket.on('dual-camera:answer', ({ interviewId, sdp, targetSocketId }) => {
    if (!interviewId || !sdp || (socket.isDualCam && socket.pairingInterviewId !== String(interviewId))) return;
    if (targetSocketId) {
      io.to(targetSocketId).emit('dual-camera:answer', { sdp, senderSocketId: socket.id });
    } else {
      socket.to(interviewId).emit('dual-camera:answer', { sdp, senderSocketId: socket.id });
    }
  });

  socket.on('dual-camera:ice-candidate', ({ interviewId, candidate, targetSocketId }) => {
    if (!interviewId || !candidate || (socket.isDualCam && socket.pairingInterviewId !== String(interviewId))) return;
    if (targetSocketId) {
      io.to(targetSocketId).emit('dual-camera:ice-candidate', { candidate, senderSocketId: socket.id });
    } else {
      socket.to(interviewId).emit('dual-camera:ice-candidate', { candidate, senderSocketId: socket.id });
    }
  });

  socket.on('dual-camera:leave', ({ interviewId }) => {
    if (!interviewId || (socket.isDualCam && socket.pairingInterviewId !== String(interviewId))) return;
    socket.to(interviewId).emit('dual-camera:left', { socketId: socket.id, reason: 'DEVICE_DISCONNECTED' });
  });

  socket.on('leave-room', ({ roomId }) => {
    if (!roomId) return;
    socket.leave(roomId);
    if (roomUsersMap.has(roomId)) {
      roomUsersMap.get(roomId).delete(socket.id);
      const participants = Array.from(roomUsersMap.get(roomId).values());
      socket.to(roomId).emit('user-left', {
        socketId: socket.id,
        userName: socket.user?.fullName,
        participants
      });
    }

    // Auto token release if token holder leaves
    const token = roomTokenMap.get(roomId);
    if (token && (token.holderSocketId === socket.id || token.holderUserId === String(socket.user?._id || ''))) {
      roomTokenMap.delete(roomId);
      io.to(roomId).emit('coding:token:update', { token: null });
    }

    socket.currentRoom = null;
  });

  // Disconnect
  socket.on('disconnect', () => {
    console.log(`[Socket.IO] Client Disconnected: ${socket.id}`);
    if (socket.currentRoom && roomUsersMap.has(socket.currentRoom)) {
      const roomId = socket.currentRoom;
      roomUsersMap.get(roomId).delete(socket.id);
      const participants = Array.from(roomUsersMap.get(roomId).values());
      socket.to(roomId).emit('user-left', {
        socketId: socket.id,
        userName: socket.user?.fullName,
        participants
      });

      const token = roomTokenMap.get(roomId);
      if (token && (token.holderSocketId === socket.id || token.holderUserId === String(socket.user?._id || ''))) {
        roomTokenMap.delete(roomId);
        io.to(roomId).emit('coding:token:update', { token: null });
      }
    }
  });
});

// Global Error Handler
app.use(errorHandler);

const PORT = Number(process.env.PORT || 5001);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`=======================================================`);
  console.log(`🚀 Collaborative Interview Platform Backend Server Live`);
  console.log(`📡 Listening on Port: http://localhost:${PORT}`);
  console.log(`🔗 Health Check: http://localhost:${PORT}/api/health`);
  console.log(`=======================================================`);
});
