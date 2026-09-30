import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Code2,
  Copy,
  Check,
  Clock,
  Video,
  Mic,
  MicOff,
  VideoOff,
  Maximize2,
  Minimize2,
  ShieldCheck,
  ShieldAlert,
  LogOut,
  Radio,
  Lock,
} from 'lucide-react';
import StatusDot from '../ui/StatusDot';
import Badge from '../ui/Badge';
import Button from '../ui/Button';

export default function RoomHeader({
  roomCode,
  title,
  durationMinutes = 60,
  onLeave,
  editingState = 'granted', // 'granted', 'requested', 'peer'
  editorName = 'You',
  isCompany = false,
}) {
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState(durationMinutes * 60);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (secs) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const copyCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const isLowTime = timeLeft < 300; // Under 5 minutes

  return (
    <header className="h-12 bg-arena-surface border-b border-arena-border px-3.5 flex items-center justify-between text-xs text-white shrink-0 select-none z-30">
      {/* Left: Brand & Room Identity */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white font-bold shadow-subtle-rim">
            <Code2 className="w-3.5 h-3.5" />
          </div>
          <span className="font-display font-bold text-sm tracking-tight hidden sm:inline">
            IntervAI
          </span>
        </div>

        <span className="text-arena-border">/</span>

        {/* Room Code with 1-click copy */}
        <div className="flex items-center gap-1.5 bg-arena-panel border border-arena-border px-2 py-0.5 rounded-md">
          <span className="font-mono text-xs font-bold text-blue-400">
            {roomCode}
          </span>
          <button
            onClick={copyCode}
            className="text-arena-dim hover:text-white p-0.5 rounded transition-colors"
            title="Copy Room Code to share"
          >
            {copied ? (
              <Check className="w-3 h-3 text-emerald-400" />
            ) : (
              <Copy className="w-3 h-3" />
            )}
          </button>
        </div>

        <span className="text-arena-border hidden md:inline">|</span>

        {/* Title */}
        <span className="text-slate-300 font-medium hidden md:inline truncate max-w-xs">
          {title || 'Technical Assessment Round'}
        </span>
      </div>

      {/* Center: Tokenized Editing Status & Timer */}
      <div className="flex items-center gap-3">
        {/* Collaboration Token Banner */}
        <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full bg-arena-panel border border-arena-border text-[11px]">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="font-medium text-slate-200">
            {editingState === 'granted'
              ? "You're editing"
              : `${editorName} is editing`}
          </span>
        </div>

        {/* Timer */}
        <div
          className={`flex items-center gap-1.5 font-mono text-xs px-2.5 py-1 rounded-md border font-semibold ${
            isLowTime
              ? 'bg-rose-950/40 text-rose-400 border-rose-800 animate-pulse'
              : 'bg-arena-panel text-slate-200 border-arena-border'
          }`}
        >
          <Clock className="w-3.5 h-3.5 text-arena-dim" />
          <span>{formatTime(timeLeft)}</span>
        </div>
      </div>

      {/* Right: Media toggles, Fullscreen & Leave */}
      <div className="flex items-center gap-2">
        {/* Mic Toggle */}
        <button
          onClick={() => setIsMicMuted(!isMicMuted)}
          className={`p-1.5 rounded-md border transition-colors ${
            isMicMuted
              ? 'bg-rose-950/40 border-rose-800 text-rose-400'
              : 'bg-arena-panel border-arena-border text-arena-muted hover:text-white hover:bg-arena-card'
          }`}
          title={isMicMuted ? 'Unmute Microphone' : 'Mute Microphone'}
        >
          {isMicMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
        </button>

        {/* Cam Toggle */}
        <button
          onClick={() => setIsCamOff(!isCamOff)}
          className={`p-1.5 rounded-md border transition-colors ${
            isCamOff
              ? 'bg-rose-950/40 border-rose-800 text-rose-400'
              : 'bg-arena-panel border-arena-border text-arena-muted hover:text-white hover:bg-arena-card'
          }`}
          title={isCamOff ? 'Turn Camera On' : 'Turn Camera Off'}
        >
          {isCamOff ? <VideoOff className="w-3.5 h-3.5" /> : <Video className="w-3.5 h-3.5" />}
        </button>

        {/* Fullscreen Toggle */}
        <button
          onClick={toggleFullscreen}
          className="p-1.5 rounded-md bg-arena-panel border border-arena-border text-arena-muted hover:text-white hover:bg-arena-card transition-colors hidden sm:inline-flex"
          title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
        >
          {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
        </button>

        {/* End / Leave Button */}
        <Button
          variant="danger"
          size="xs"
          onClick={onLeave || (() => navigate('/dashboard'))}
          icon={LogOut}
        >
          {isCompany ? 'End Session' : 'Leave Room'}
        </Button>
      </div>
    </header>
  );
}
