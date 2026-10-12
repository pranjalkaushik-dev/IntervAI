import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import monitoringApi from '../../api/monitoringApi';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import QRCodeView from '../ui/QRCodeView';
import CvProctoringPanel from './CvProctoringPanel';
import {
  Sparkles,
  ShieldAlert,
  Video,
  MessageSquare,
  Users,
  Send,
  AlertTriangle,
  CheckCircle2,
  Smartphone,
  Eye,
  Cpu,
  Layers,
  Lock,
} from 'lucide-react';

export default function MonitorPanel({ roomCode, interviewId, aiFeedback, aiFeedbackStatus }) {
  const { socket } = useSocket();
  const { user, isStudent, isCompany } = useAuth();
  const [activeTab, setActiveTab] = useState(isStudent ? 'proctor' : 'ai'); // 'ai', 'proctor', 'chat'

  // AI State
  const qualityScore = aiFeedback?.codeQualityScore ?? null;
  const timeComplexity = aiFeedback?.timeComplexity ?? null;
  const spaceComplexity = aiFeedback?.spaceComplexity ?? null;
  const [companyNotes, setCompanyNotes] = useState('');

  // Real persisted proctoring log; no demo records.
  const [violations, setViolations] = useState([]);
  const [monitoringError, setMonitoringError] = useState('');

  // Dual-Camera States
  const [isSecondaryCamActive, setIsSecondaryCamActive] = useState(false);
  const [pairingUrl, setPairingUrl] = useState('');
  const secondaryVideoRef = useRef(null);

  // Real-time interview chat. Starts empty for a new room.
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');

  useEffect(() => {
    if (!interviewId) return;
    let cancelled = false;
    monitoringApi.getInterviewViolations(interviewId).then((response) => {
      if (cancelled) return;
      setMonitoringError('');
      const rows = response?.data?.violations || [];
      setViolations(rows.map((row) => ({
        id: row._id,
        message: `${row.studentId?.fullName || 'Student'}: ${String(row.violationType || 'OTHER').replaceAll('_', ' ')}`,
        time: new Date(row.timestamp || row.createdAt || Date.now()).toLocaleTimeString(),
        type: 'warning',
      })));
    }).catch((error) => {
      if (!cancelled) {
        setMonitoringError(error?.response?.data?.message || error?.message || 'Unable to load monitoring events.');
      }
    });
    return () => { cancelled = true; };
  }, [interviewId]);

  useEffect(() => {
    if (!socket || !isCompany || !interviewId) return;
    let pc;
    const onJoined = ({ socketId }) => {
      if (!socketId) return;
      pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
      pc.onconnectionstatechange = () => {
        setIsSecondaryCamActive(pc.connectionState === 'connected');
      };
      pc.ontrack = (event) => {
        if (secondaryVideoRef.current) {
          if (!secondaryVideoRef.current.srcObject) secondaryVideoRef.current.srcObject = new MediaStream();
          const stream = secondaryVideoRef.current.srcObject;
          if (!stream.getTracks().some((track) => track.id === event.track.id)) stream.addTrack(event.track);
        }
      };
      pc.onicecandidate = (event) => {
        if (event.candidate) socket.emit('dual-camera:ice-candidate', { interviewId, candidate: event.candidate, targetSocketId: socketId });
      };
      const offer = async () => {
        const o = await pc.createOffer();
        await pc.setLocalDescription(o);
        socket.emit('dual-camera:offer', { interviewId, sdp: pc.localDescription, targetSocketId: socketId });
      };
      offer().catch((err) => console.warn('[DualCam] offer failed', err));
    };
    const onAnswer = async ({ sdp }) => {
      try { await pc?.setRemoteDescription(sdp); } catch (err) { console.warn('[DualCam] answer failed', err); }
    };
    const onIce = async ({ candidate }) => {
      if (!candidate || !pc) return;
      try { await pc.addIceCandidate(candidate); } catch (err) { console.warn('[DualCam] ICE failed', err); }
    };
    socket.on('dual-camera:joined', onJoined);
    socket.on('dual-camera:answer', onAnswer);
    socket.on('dual-camera:ice-candidate', onIce);
    return () => {
      socket.off('dual-camera:joined', onJoined);
      socket.off('dual-camera:answer', onAnswer);
      socket.off('dual-camera:ice-candidate', onIce);
      pc?.close();
    };
  }, [socket, interviewId, isCompany]);

  useEffect(() => {
    if (!isCompany || !interviewId) return;
    monitoringApi.generateDualCamToken(interviewId).then(r => setPairingUrl(r.data?.pairingUrl || '')).catch(() => {});
  }, [interviewId, isCompany]);

  useEffect(() => {
    if (!socket) return;
    const onChat = (data) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === data.id)) return prev;
        return [...prev, { ...data, time: new Date(data.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), isMe: String(data.userId) === String(user?.id || user?._id) }];
      });
    };
    socket.on('chat:message', onChat);
    return () => socket.off('chat:message', onChat);
  }, [socket, user]);

  // Tab switch detection
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && isStudent && socket && roomCode) {
        const violationData = {
          roomId: roomCode,
          studentId: user?.id || user?._id,
          violationType: 'TAB_HIDDEN',
          interviewId,
        };
        socket.emit('monitoring:violation', violationData);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [socket, roomCode, interviewId, user, isStudent]);

  // Socket Violation Alert (Preserved existing logic)
  useEffect(() => {
    if (!socket) return;

    const handleViolationAlert = (data) => {
      const id = data.logId || `${data.studentId}-${data.violationType}-${data.timestamp}`;
      setViolations((prev) => {
        if (prev.some((violation) => String(violation.id) === String(id))) return prev;
        return [
        {
          id,
          message: `${data.studentName || data.studentId || 'Student'}: ${String(data.violationType || 'Monitoring violation').replaceAll('_', ' ')}`,
          time: new Date(data.timestamp || Date.now()).toLocaleTimeString(),
          type: 'warning',
        },
        ...prev,
        ];
      });
    };

    socket.on('violation-alert', handleViolationAlert);
    return () => {
      socket.off('violation-alert', handleViolationAlert);
    };
  }, [socket]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const newMsg = {
      id: Date.now(),
      sender: user?.fullName || 'User',
      text: chatInput.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isMe: true,
    };

    if (socket && roomCode) {
      socket.emit('chat:message', { roomId: roomCode, text: newMsg.text });
    }
    setChatInput('');
  };

  return (
    <div className="h-full flex flex-col bg-white border-l border-arena-border text-xs overflow-hidden select-none">
      {/* Tab Switcher Ribbon */}
      <div className="h-10 bg-slate-50 border-b border-arena-border px-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1.5">
          {!isStudent && (
            <button
              onClick={() => setActiveTab('ai')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                activeTab === 'ai'
                  ? 'bg-white text-purple-700 shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Insights</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('proctor')}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors relative ${
              activeTab === 'proctor'
                ? 'bg-white text-blue-700 shadow-sm border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            <span>Dual-Cam</span>
            {violations.some((v) => v.type === 'warning') && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('chat')}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              activeTab === 'chat'
                ? 'bg-white text-emerald-700 shadow-sm border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Chat ({messages.length})</span>
          </button>
        </div>
      </div>

        {isStudent && (
          <div className={activeTab === 'proctor'
            ? ''
            : 'fixed -left-[9999px] top-0 h-px w-px overflow-hidden opacity-0 pointer-events-none'}
          >
            <CvProctoringPanel interviewId={interviewId} />
          </div>
        )}

        {/* Tab 1: AI Evaluation & Feedback */}
        {activeTab === 'ai' && (
        <div className="flex-1 p-3.5 overflow-y-auto space-y-3.5 select-text">
          {/* Header & Score Gauge */}
          <div className="p-3 rounded-lg bg-white border border-slate-200 shadow-sm space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-900 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                <span>Gemini Code Evaluation</span>
              </span>
            </div>

            {aiFeedbackStatus === 'UNAVAILABLE' && (
              <p role="status" className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded border border-amber-200">
                Code submission was saved, but AI feedback could not be generated.
              </p>
            )}

            {/* Quality Score & Complexity Grid */}
            <div className="grid grid-cols-3 gap-2 pt-1 font-mono text-center">
              <div className="p-2 rounded bg-slate-50 border border-slate-200">
                <div className="text-[10px] text-slate-500 uppercase font-medium">Quality</div>
                <div className="text-base font-bold text-purple-700">
                  {qualityScore !== null ? `${qualityScore}/100` : '—'}
                </div>
              </div>
              <div className="p-2 rounded bg-slate-50 border border-slate-200">
                <div className="text-[10px] text-slate-500 uppercase font-medium">Time</div>
                <div className="text-base font-bold text-emerald-700">
                  {timeComplexity || '—'}
                </div>
              </div>
              <div className="p-2 rounded bg-slate-50 border border-slate-200">
                <div className="text-[10px] text-slate-500 uppercase font-medium">Space</div>
                <div className="text-base font-bold text-blue-700">
                  {spaceComplexity || '—'}
                </div>
              </div>
            </div>
          </div>

          {/* Key Strengths */}
          <div className="p-3 rounded-lg bg-white border border-slate-200 shadow-sm space-y-1.5">
            <div className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Algorithmic Strengths</span>
            </div>
            <ul className="text-[11px] text-slate-700 space-y-1 list-disc list-inside">
              {(aiFeedback?.summary || aiFeedback?.suggestions?.length)
                ? (
                  <>
                    {aiFeedback.summary && <li>{aiFeedback.summary}</li>}
                    {aiFeedback.suggestions?.map((suggestion, index) => (
                      <li key={index}>{suggestion}</li>
                    ))}
                  </>
                )
                : <li className="text-slate-500 list-none italic">Submit a solution to generate Gemini AI insights.</li>}
            </ul>
          </div>

          {/* Potential Issues & Corner Cases */}
          <div className="p-3 rounded-lg bg-white border border-slate-200 shadow-sm space-y-1.5">
            <div className="text-[11px] font-semibold text-amber-700 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span>Edge Case Scrutiny</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              {aiFeedback?.suggestions?.[1] ||
                aiFeedback?.suggestions?.[0] ||
                'No AI edge-case feedback available yet.'}
            </p>
          </div>

          {/* Optimization Suggestions */}
          <div className="p-3 rounded-lg bg-white border border-slate-200 shadow-sm space-y-1.5">
            <div className="text-[11px] font-semibold text-blue-700 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-blue-600" />
              <span>Optimization Recommendations</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              {aiFeedback?.suggestions?.[0] ||
                'No optimization recommendations available yet.'}
            </p>
          </div>

          {/* Company Notes & Rubric */}
          <div className="p-3 rounded-lg bg-white border border-slate-200 shadow-sm space-y-1.5">
            <div className="text-[11px] font-semibold text-slate-800">
              Company Rubric & Talking Points
            </div>
            <textarea
              rows={2}
              value={companyNotes}
              onChange={(e) => setCompanyNotes(e.target.value)}
              placeholder="Private company assessment notes..."
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-[11px] text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>
      )}

      {/* Tab 2: Dual-Camera Proctoring & Violation Logs */}
      {activeTab === 'proctor' && (
        <div className="flex-1 p-3.5 overflow-y-auto space-y-3.5 select-text">
          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-600 leading-relaxed">
            Browser activity is logged when detected. Camera and CV status is shown on the candidate device; a secondary camera is linked only when its live video appears below.
          </div>

          {/* Camera UI: Dual Video Streams */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-800">
              <span>Student Feeds</span>
              <span className="text-[10px] text-slate-500 font-normal">
                {isSecondaryCamActive ? 'Secondary camera connected' : 'Secondary camera not connected'}
              </span>
            </div>

            {/* Primary Video Feed */}
            <div className="relative h-24 rounded-lg bg-[#F8FAFC] border border-[#DFE5EF] overflow-hidden flex items-center justify-center">
              <span className="px-3 text-center text-[10px] text-[#596579]">
                Candidate camera is processed on device and analyzed for behavioral telemetry.
              </span>

              <div className="absolute top-1.5 left-2 bg-white/90 border border-[#DFE5EF] px-1.5 py-0.5 rounded text-[9px] text-[#172033] font-mono font-bold">
                Face Camera
              </div>
            </div>

            {/* Secondary Camera Feed (<video> element as requested) */}
            <div className="relative h-24 rounded-lg bg-[#F8FAFC] border border-[#DFE5EF] overflow-hidden flex items-center justify-center">
              <video
                ref={secondaryVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {!isSecondaryCamActive && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-center space-y-1">
                    <div className="w-6 h-6 rounded-full bg-[#EFF4FF] text-[#365FEA] flex items-center justify-center mx-auto">
                      <Smartphone className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-[10px] text-[#596579] font-medium block">
                      Secondary Phone Camera (Scan QR to pair)
                    </span>
                  </div>
                </div>
              )}

              <div className="absolute top-1.5 left-2 bg-white/90 border border-[#DFE5EF] px-1.5 py-0.5 rounded text-[9px] text-[#365FEA] font-mono font-bold">
                Secondary Angle
              </div>
            </div>
          </div>

          {/* QR Code Secondary Camera Pairing Component */}
          <QRCodeView roomCode={roomCode} pairingUrl={pairingUrl} />
            {pairingUrl && <div className="text-[10px] text-slate-500 break-all px-1">Phone link: {pairingUrl}</div>}

          {monitoringError && (
            <p role="alert" className="text-[11px] text-rose-600 bg-rose-50 border border-rose-200 p-2 rounded">{monitoringError}</p>
          )}

          {/* Real-time Violation Display Log */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-800">
              <span className="flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                <span>Violation & Telemetry Log</span>
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                {violations.length} events
              </span>
            </div>

            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {violations.length === 0 ? (
                <div className="text-[11px] text-slate-400 italic text-center py-3 bg-slate-50 rounded border border-dashed border-slate-200">
                  No violations detected.
                </div>
              ) : (
                violations.map((v) => (
                  <div
                    key={v.id}
                    className={`p-2 rounded border text-[11px] flex items-start justify-between gap-2 ${
                      v.type === 'warning'
                        ? 'bg-amber-50 border-amber-200 text-amber-900'
                        : 'bg-white border-slate-200 text-slate-700 shadow-sm'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      {v.type === 'warning' ? (
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      )}
                      <span>{v.message}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                      {v.time}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Live Collaborative Chat */}
      {activeTab === 'chat' && (
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
          {/* Messages Stream */}
          <div className="flex-1 p-3 overflow-y-auto space-y-2.5 select-text">
            {messages.length === 0 ? (
              <div className="text-[11px] text-slate-400 italic text-center py-8">
                No chat messages yet. Start collaborating below.
              </div>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex flex-col ${m.isMe ? 'items-end' : 'items-start'}`}
                >
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-0.5">
                    <span className="font-semibold text-slate-700">{m.sender}</span>
                    <span>&bull;</span>
                    <span>{m.time}</span>
                  </div>
                  <div
                    className={`max-w-[85%] p-2 rounded-lg text-xs leading-relaxed ${
                      m.isMe
                        ? 'bg-blue-600 text-white rounded-br-none shadow-sm'
                        : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none shadow-sm'
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Chat Input */}
          <form
            onSubmit={handleSendMessage}
            className="p-2.5 bg-white border-t border-slate-200 flex gap-1.5"
          >
            <input
              type="text"
              placeholder="Send message to room..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              className="flex-1 px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
            <Button type="submit" size="xs" disabled={!chatInput.trim()}>
              <Send className="w-3 h-3" />
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
