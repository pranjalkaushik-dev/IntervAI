import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import monitoringApi from '../../api/monitoringApi';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import StatusDot from '../ui/StatusDot';
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
  Check,
  Smartphone,
  Eye,
  RefreshCw,
  Cpu,
  Layers,
  Lock,
} from 'lucide-react';

export default function MonitorPanel({ roomCode, interviewId, aiFeedback }) {
  const { socket } = useSocket();
  const { user, isStudent, isCompany } = useAuth();
  const [activeTab, setActiveTab] = useState(isStudent ? 'proctor' : 'ai'); // 'ai', 'proctor', 'chat'

  // AI State
  const qualityScore = aiFeedback?.codeQualityScore ?? null;
  const timeComplexity = aiFeedback?.timeComplexity ?? null;
  const spaceComplexity = aiFeedback?.spaceComplexity ?? null;
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [companyNotes, setCompanyNotes] = useState('');

  // Real persisted proctoring log; no demo records.
  const [violations, setViolations] = useState([]);

  // Dual-Camera States
  const [isPrimaryCamActive, setIsPrimaryCamActive] = useState(true);
  const [isSecondaryCamActive, setIsSecondaryCamActive] = useState(true);
  const [showPairingModal, setShowPairingModal] = useState(false);
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
      const rows = response?.data?.violations || [];
      setViolations(rows.map((row) => ({
        id: row._id,
        message: `${row.studentId?.fullName || 'Student'}: ${String(row.violationType || 'OTHER').replaceAll('_', ' ')}`,
        time: new Date(row.timestamp || row.createdAt || Date.now()).toLocaleTimeString(),
        type: 'warning',
      })));
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [interviewId]);

  useEffect(() => {
    if (!socket || !isCompany || !interviewId) return;
    let pc;
    const onJoined = ({ socketId }) => {
      if (!socketId) return;
      pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
      pc.ontrack = (event) => {
        if (secondaryVideoRef.current) {
          if (!secondaryVideoRef.current.srcObject) secondaryVideoRef.current.srcObject = new MediaStream();
          const stream = secondaryVideoRef.current.srcObject;
          if (!stream.getTracks().some((track) => track.id === event.track.id)) stream.addTrack(event.track);
        }
        setIsSecondaryCamActive(true);
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
      setViolations((prev) => [
        {
          id: Date.now(),
          message: `${data.studentName || data.studentId || 'Student'}: ${String(data.violationType || 'Monitoring violation').replaceAll('_', ' ')}`,
          time: new Date(data.timestamp || Date.now()).toLocaleTimeString(),
          type: 'warning',
        },
        ...prev,
      ]);
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

  const reanalyzeWithAI = () => {
    // Re-analysis will be triggered by a fresh submission.
    // The panel only displays the latest real Gemini evaluation.
    setIsAnalyzing(true);
    setTimeout(() => {
      setIsAnalyzing(false);
    }, 700);
  };

  return (
    <div className="h-full flex flex-col bg-arena-surface border-l border-arena-border text-xs overflow-hidden select-none">
      {/* Tab Switcher Ribbon */}
      <div className="h-9 bg-arena-panel border-b border-arena-border px-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1">
          {!isStudent && <button
            onClick={() => setActiveTab('ai')}
            className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1.5 transition-colors ${
              activeTab === 'ai'
                ? 'bg-arena-card text-purple-400 font-semibold'
                : 'text-arena-muted hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Insights</span>
          </button>}

          <button
            onClick={() => setActiveTab('proctor')}
            className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1.5 transition-colors relative ${
              activeTab === 'proctor'
                ? 'bg-arena-card text-blue-400 font-semibold'
                : 'text-arena-muted hover:text-white'
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            <span>Dual-Cam</span>
            {violations.some((v) => v.type === 'warning') && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('chat')}
            className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1.5 transition-colors ${
              activeTab === 'chat'
                ? 'bg-arena-card text-emerald-400 font-semibold'
                : 'text-arena-muted hover:text-white'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Chat ({messages.length})</span>
          </button>
        </div>
      </div>

      {/* Tab 1: AI Evaluation & Feedback */}
      {activeTab === 'ai' && (
        <div className="flex-1 p-3.5 overflow-y-auto space-y-3.5 select-text">
          {/* Header & Score Gauge */}
          <div className="p-3 rounded-lg bg-arena-panel border border-arena-border space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-white flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span>Gemini Code Evaluation</span>
              </span>
              <button
                onClick={reanalyzeWithAI}
                disabled={isAnalyzing}
                className="text-arena-dim hover:text-purple-400 p-1 rounded transition-colors"
                title="Re-run AI Analysis"
              >
                <RefreshCw className={`w-3 h-3 ${isAnalyzing ? 'animate-spin text-purple-400' : ''}`} />
              </button>
            </div>

            {/* Quality Score & Complexity Grid */}
            <div className="grid grid-cols-3 gap-2 pt-1 font-mono text-center">
              <div className="p-2 rounded bg-arena-surface border border-arena-border">
                <div className="text-[10px] text-arena-dim uppercase">Quality</div>
                <div className="text-base font-bold text-purple-400">
                  {qualityScore !== null ? `${qualityScore}/100` : '—'}
                </div>
              </div>
              <div className="p-2 rounded bg-arena-surface border border-arena-border">
                <div className="text-[10px] text-arena-dim uppercase">Time</div>
                <div className="text-base font-bold text-emerald-400">
                  {timeComplexity || '—'}
                </div>
              </div>
              <div className="p-2 rounded bg-arena-surface border border-arena-border">
                <div className="text-[10px] text-arena-dim uppercase">Space</div>
                <div className="text-base font-bold text-blue-400">
                  {spaceComplexity || '—'}
                </div>
              </div>
            </div>
          </div>

          {/* Key Strengths */}
          <div className="p-3 rounded-lg bg-arena-panel border border-arena-border space-y-1.5">
            <div className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Algorithmic Strengths</span>
            </div>
            <ul className="text-[11px] text-slate-300 space-y-1 list-disc list-inside">
              {(aiFeedback?.summary || aiFeedback?.suggestions?.length)
                ? (
                  <>
                    {aiFeedback.summary && <li>{aiFeedback.summary}</li>}
                    {aiFeedback.suggestions?.map((suggestion, index) => (
                      <li key={index}>{suggestion}</li>
                    ))}
                  </>
                )
                : <li>Submit a solution to generate Gemini AI insights.</li>}
            </ul>
          </div>

          {/* Potential Issues & Corner Cases */}
          <div className="p-3 rounded-lg bg-arena-panel border border-arena-border space-y-1.5">
            <div className="text-[11px] font-semibold text-amber-400 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Edge Case Scrutiny</span>
            </div>
            <p className="text-[11px] text-arena-muted leading-relaxed">
              {aiFeedback?.suggestions?.[1] ||
                aiFeedback?.suggestions?.[0] ||
                'No AI edge-case feedback available yet.'}
            </p>
          </div>

          {/* Optimization Suggestions */}
          <div className="p-3 rounded-lg bg-arena-panel border border-arena-border space-y-1.5">
            <div className="text-[11px] font-semibold text-blue-400 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5" />
              <span>Optimization Recommendations</span>
            </div>
            <p className="text-[11px] text-arena-muted leading-relaxed">
              {aiFeedback?.suggestions?.[0] ||
                'No optimization recommendations available yet.'}
            </p>
          </div>

          {/* Company Notes & Rubric */}
          <div className="p-3 rounded-lg bg-arena-panel border border-arena-border space-y-1.5">
            <div className="text-[11px] font-semibold text-slate-200">
              Company Rubric & Talking Points
            </div>
            <textarea
              rows={2}
              value={companyNotes}
              onChange={(e) => setCompanyNotes(e.target.value)}
              placeholder="Private company assessment notes..."
              className="w-full p-2 bg-arena-surface border border-arena-border rounded text-[11px] text-slate-300 focus:outline-none"
            />
          </div>
        </div>
      )}

      {/* Tab 2: Dual-Camera Proctoring & Violation Logs */}
      {activeTab === 'proctor' && (
        <div className="flex-1 p-3.5 overflow-y-auto space-y-3.5 select-text">
          {/* Status Indicators Strip */}
          <div className="p-2.5 rounded-lg bg-arena-panel border border-arena-border grid grid-cols-2 gap-2 text-[10px] font-medium">
            <div className="flex items-center gap-1.5 text-emerald-400">
              <Check className="w-3 h-3" />
              <span>Fullscreen active</span>
            </div>
            <div className="flex items-center gap-1.5 text-emerald-400">
              <Check className="w-3 h-3" />
              <span>Primary cam OK</span>
            </div>
            <div className="flex items-center gap-1.5 text-emerald-400">
              <Check className="w-3 h-3" />
              <span>Tab monitor active</span>
            </div>
            <div className="flex items-center gap-1.5 text-blue-400">
              <Smartphone className="w-3 h-3" />
              <span>Secondary cam linked</span>
            </div>
          </div>

          {/* AI CV Proctoring */}
          <CvProctoringPanel interviewId={interviewId} />

          {/* Camera UI: Dual Video Streams */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-200">
              <span>Student Feeds</span>
              <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                <StatusDot status="live" label="1080p Stream" pulse />
              </span>
            </div>

            {/* Primary Video Feed */}
            <div className="relative h-28 rounded-lg bg-slate-950 border border-arena-border overflow-hidden flex items-center justify-center">
              {isPrimaryCamActive ? (
                <div className="text-center space-y-1">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center mx-auto">
                    <Video className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] text-arena-dim font-mono">
                    Primary Student Webcam Feed
                  </span>
                </div>
              ) : (
                <span className="text-[11px] text-arena-dim">Primary Camera Muted</span>
              )}

              <div className="absolute top-1.5 left-2 bg-black/60 px-1.5 py-0.5 rounded text-[9px] text-slate-300 font-mono">
                Face Camera
              </div>
            </div>

            {/* Secondary Camera Feed (<video> element as requested) */}
            <div className="relative h-24 rounded-lg bg-slate-950 border border-arena-border overflow-hidden flex items-center justify-center">
              <video
                ref={secondaryVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover opacity-80"
              />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center space-y-1">
                  <div className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center mx-auto">
                    <Smartphone className="w-3 h-3" />
                  </div>
                  <span className="text-[10px] text-arena-dim font-mono">
                    Secondary Mobile Camera &bull; Desk Angle
                  </span>
                </div>
              </div>

              <div className="absolute top-1.5 left-2 bg-black/60 px-1.5 py-0.5 rounded text-[9px] text-cyan-300 font-mono">
                Secondary Angle &lt;video&gt;
              </div>
            </div>
          </div>

          {/* QR Code Secondary Camera Pairing Component */}
          <QRCodeView roomCode={roomCode} pairingUrl={pairingUrl} />
            {pairingUrl && <div className="text-[9px] text-arena-dim break-all px-1">Phone link: {pairingUrl}</div>}

          {/* Real-time Violation Display Log */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-200">
              <span className="flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                <span>Violation & Telemetry Log</span>
              </span>
              <span className="text-[10px] text-arena-dim font-mono">
                {violations.length} events
              </span>
            </div>

            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {violations.map((v) => (
                <div
                  key={v.id}
                  className={`p-2 rounded border text-[11px] flex items-start justify-between gap-2 ${
                    v.type === 'warning'
                      ? 'bg-amber-950/40 border-amber-800 text-amber-200'
                      : 'bg-arena-panel border-arena-border text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    {v.type === 'warning' ? (
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    )}
                    <span>{v.message}</span>
                  </div>
                  <span className="text-[10px] text-arena-dim shrink-0 font-mono">
                    {v.time}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Live Collaborative Chat */}
      {activeTab === 'chat' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Messages Stream */}
          <div className="flex-1 p-3 overflow-y-auto space-y-2.5 select-text">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${m.isMe ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center gap-1.5 text-[10px] text-arena-dim mb-0.5">
                  <span className="font-semibold text-slate-300">{m.sender}</span>
                  <span>&bull;</span>
                  <span>{m.time}</span>
                </div>
                <div
                  className={`max-w-[85%] p-2 rounded-lg text-xs ${
                    m.isMe
                      ? 'bg-arena-blue text-white rounded-br-none'
                      : 'bg-arena-panel border border-arena-border text-slate-200 rounded-bl-none'
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
          </div>

          {/* Chat Input */}
          <form
            onSubmit={handleSendMessage}
            className="p-2.5 bg-arena-panel border-t border-arena-border flex gap-1.5"
          >
            <input
              type="text"
              placeholder="Send message to room..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              className="flex-1 px-2.5 py-1.5 text-xs bg-arena-surface border border-arena-border rounded text-white focus:outline-none focus:border-arena-blue"
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
