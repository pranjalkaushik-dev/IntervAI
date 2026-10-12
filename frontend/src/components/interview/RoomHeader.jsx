import React, { useState, useEffect } from 'react';
import {
  Code2,
  Copy,
  Check,
  Clock,
  Video,
  VideoOff,
  Mic,
  MicOff,
  MonitorUp,
  Maximize2,
  Minimize2,
  LogOut,
  StopCircle,
  PanelLeftClose,
  PanelLeft,
  PanelRightClose,
  PanelRight,
} from 'lucide-react';

export default function RoomHeader({
  roomCode,
  title,
  durationMinutes = 60,
  onLeave,
  onOpenEndModal,
  ending = false,
  editingState = 'granted', // 'granted', 'requested', 'peer'
  editorName = 'You',
  isCompany = false,
  isProblemPaneCollapsed = false,
  onToggleProblemPane,
  isRightSidebarCollapsed = false,
  onToggleRightSidebar,
  mediaStatus = { camera: false, mic: false, screen: false, connected: false },
  onOpenMediaTab,
}) {
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState(durationMinutes * 60);
  const [isFullscreen, setIsFullscreen] = useState(false);

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
    <header className="h-12 bg-white border-b border-arena-border px-3.5 flex items-center justify-between text-xs text-slate-800 shrink-0 select-none z-30">
      {/* Left: Brand & Room Identity */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center text-white font-bold shadow-sm">
            <Code2 className="w-3.5 h-3.5" />
          </div>
          <span className="font-display font-bold text-sm tracking-tight text-slate-900 hidden sm:inline">
            Interv<span className="text-blue-600">AI</span>
          </span>
        </div>

        <span className="text-slate-300">/</span>

        {/* Room Code with 1-click copy */}
        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md">
          <span className="font-mono text-xs font-bold text-blue-600">
            {roomCode}
          </span>
          <button
            onClick={copyCode}
            className="text-slate-400 hover:text-slate-700 p-0.5 rounded transition-colors"
            title="Copy Room Code to share"
          >
            {copied ? (
              <Check className="w-3 h-3 text-emerald-600" />
            ) : (
              <Copy className="w-3 h-3" />
            )}
          </button>
        </div>

        <span className="text-slate-300 hidden md:inline">|</span>

        {/* Title */}
        <span className="text-slate-700 font-medium hidden md:inline truncate max-w-xs">
          {title || 'Technical Assessment Round'}
        </span>
      </div>

      {/* Center: Tokenized Editing Status & Timer */}
      {/* Center: Tokenized Editing Status, Real-time Media Badge & Timer */}
      <div className="flex items-center gap-2.5">
        {/* Collaboration Token Banner */}
        <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200 text-[11px]">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="font-medium text-slate-700">
            {editingState === 'granted'
              ? "You're editing"
              : `${editorName} is editing`}
          </span>
        </div>

        {/* Unified Real-time Media Status Badge (Click opens Media widget) */}
        <button
          type="button"
          onClick={onOpenMediaTab}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 text-slate-700 transition-colors"
          title="Live Media Status — Click to open Media Panel controls"
        >
          <span
            className={`w-2 h-2 rounded-full ${
              mediaStatus.connected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'
            }`}
          />
          <span className="text-[11px] font-medium hidden md:inline text-slate-600">
            {mediaStatus.connected ? 'Stream Live' : 'Connecting'}
          </span>
          <div className="h-3 w-px bg-slate-200 mx-0.5 hidden md:block" />
          <span
            title={mediaStatus.mic ? 'Microphone: Active' : 'Microphone: Muted'}
            className={mediaStatus.mic ? 'text-slate-700' : 'text-rose-500'}
          >
            {mediaStatus.mic ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
          </span>
          <span
            title={mediaStatus.camera ? 'Camera: Active' : 'Camera: Off'}
            className={mediaStatus.camera ? 'text-slate-700' : 'text-slate-400'}
          >
            {mediaStatus.camera ? <Video className="w-3.5 h-3.5" /> : <VideoOff className="w-3.5 h-3.5" />}
          </span>
          {mediaStatus.screen && (
            <span title="Screen sharing is active" className="text-blue-600">
              <MonitorUp className="w-3.5 h-3.5" />
            </span>
          )}
        </button>

        {/* Timer */}
        <div
          className={`flex items-center gap-1.5 font-mono text-xs px-2.5 py-1 rounded-md border font-semibold ${
            isLowTime
              ? 'bg-rose-50 text-rose-700 border-rose-300 animate-pulse'
              : 'bg-slate-50 text-slate-800 border-slate-200'
          }`}
          title="Interview countdown"
        >
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>{formatTime(timeLeft)}</span>
        </div>
      </div>

      {/* Right: Layout toggles, Fullscreen, Leave Room, and Authorized End Action */}
      <div className="flex items-center gap-2">
        {/* Sidebar Panel Toggles */}
        {onToggleProblemPane && (
          <button
            onClick={onToggleProblemPane}
            className={`p-1.5 rounded-md border text-xs transition-colors hidden md:inline-flex items-center gap-1 ${
              isProblemPaneCollapsed
                ? 'bg-blue-50 border-blue-200 text-blue-700 font-semibold'
                : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
            title={isProblemPaneCollapsed ? 'Show Problem Panel (Left)' : 'Collapse Problem Panel (Left)'}
          >
            {isProblemPaneCollapsed ? <PanelLeft className="w-3.5 h-3.5" /> : <PanelLeftClose className="w-3.5 h-3.5" />}
            <span className="text-[10px] hidden xl:inline">Problem</span>
          </button>
        )}

        {onToggleRightSidebar && (
          <button
            onClick={onToggleRightSidebar}
            className={`p-1.5 rounded-md border text-xs transition-colors hidden lg:inline-flex items-center gap-1 ${
              isRightSidebarCollapsed
                ? 'bg-blue-50 border-blue-200 text-blue-700 font-semibold'
                : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
            title={isRightSidebarCollapsed ? 'Show Secondary Panel (Right)' : 'Collapse Secondary Panel (Right)'}
          >
            {isRightSidebarCollapsed ? <PanelRight className="w-3.5 h-3.5" /> : <PanelRightClose className="w-3.5 h-3.5" />}
            <span className="text-[10px] hidden xl:inline">Widgets</span>
          </button>
        )}

        {/* Fullscreen Toggle */}
        <button
          onClick={toggleFullscreen}
          className="p-1.5 rounded-md bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors hidden sm:inline-flex"
          title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
        >
          {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
        </button>

        <div className="h-4 w-px bg-slate-200" />

        {/* Standard Non-Destructive Exit Action: Leave Room */}
        <button
          onClick={onLeave}
          className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
          title="Exit this room without terminating the interview session"
        >
          <LogOut className="w-3.5 h-3.5 text-slate-500" />
          <span>Leave Room</span>
        </button>

        {/* Authorized Destructive Action: End Interview (Interviewer only) */}
        {isCompany && (
          <button
            onClick={onOpenEndModal}
            disabled={ending}
            className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs disabled:opacity-50"
            title="Conclude interview and generate candidate scorecard"
          >
            <StopCircle className="w-3.5 h-3.5 text-rose-600" />
            <span>{ending ? 'Ending…' : 'End Interview'}</span>
          </button>
        )}
      </div>
    </header>
  );
}
