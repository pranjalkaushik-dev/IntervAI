import React, { useEffect, useState, useRef } from 'react';
import LoadingSpinner from '../components/common/LoadingSpinner';
import {
  Sparkles,
  Video,
  ShieldCheck,
  FileText,
  Briefcase,
  PanelRightClose,
  PanelLeft,
  PanelRight,
} from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import interviewApi from '../api/interviewApi';
import RoomHeader from '../components/interview/RoomHeader';
import QuestionPane from '../components/interview/QuestionPane';
import EditorPane from '../components/interview/EditorPane';
import MonitorPanel from '../components/interview/MonitorPanel';
import InterviewAssistantPanel from '../components/interview/InterviewAssistantPanel';
import LiveInterviewPanel from '../components/interview/LiveInterviewPanel';
import { isInterviewActive } from '../utils/interviewStatus';
import QuestionResponsePanel from '../components/interview/QuestionResponsePanel';
import InterviewReportPanel from '../components/interview/InterviewReportPanel';

import SystemDesignCanvas from '../components/interview/SystemDesignCanvas';
import ResumeUploadPanel from '../components/interview/ResumeUploadPanel';
import EndInterviewModal from '../components/interview/EndInterviewModal';

export default function InterviewRoomPage() {
  const { roomCode } = useParams();
  const { user, isCompany } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();

  const [interview, setInterview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [aiFeedback, setAiFeedback] = useState(null);
  const [aiFeedbackStatus, setAiFeedbackStatus] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [noQuestions, setNoQuestions] = useState(false);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [ending, setEnding] = useState(false);
  const [isEndModalOpen, setIsEndModalOpen] = useState(false);
  const [isProblemPaneCollapsed, setIsProblemPaneCollapsed] = useState(false);
  const [isRightSidebarCollapsed, setIsRightSidebarCollapsed] = useState(false);
  const [activeRightTab, setActiveRightTab] = useState('video'); // 'video', 'copilot', 'monitor', 'evaluation', 'resume'

  // Unified Media State reported by LiveInterviewPanel
  const [mediaStatus, setMediaStatus] = useState({
    camera: false,
    mic: false,
    screen: false,
    connected: false,
    remoteScreenVisible: false,
  });
  const mediaControlsRef = useRef(null);

  // Auto-reveal media panel when remote peer shares screen
  useEffect(() => {
    if (mediaStatus.remoteScreenVisible) {
      setActiveRightTab('video');
      setIsRightSidebarCollapsed(false);
    }
  }, [mediaStatus.remoteScreenVisible]);

  // Resizable Right Sidebar State (persisted in sessionStorage)
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('intervai:sidebar_width');
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed) && parsed >= 280 && parsed <= 600) return parsed;
      return Math.min(420, Math.max(340, Math.floor(window.innerWidth * 0.25)));
    }
    return 380;
  });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartXRef = useRef(0);
  const dragStartWidthRef = useRef(sidebarWidth);

  useEffect(() => {
    if (!isDragging) return;

    const handlePointerMove = (e) => {
      const deltaX = dragStartXRef.current - e.clientX;
      const targetWidth = dragStartWidthRef.current + deltaX;

      const minWidth = 280;
      const maxDesktop = Math.min(600, Math.floor(window.innerWidth * 0.45));
      const leftPaneWidth = isProblemPaneCollapsed ? 28 : 360;
      const maxGivenEditorMin = Math.max(minWidth, window.innerWidth - leftPaneWidth - 400); // 400px min editor
      const maxWidth = Math.min(maxDesktop, maxGivenEditorMin);

      const clamped = Math.min(maxWidth, Math.max(minWidth, targetWidth));
      setSidebarWidth(clamped);
      sessionStorage.setItem('intervai:sidebar_width', String(clamped));
    };

    const handlePointerUp = () => {
      setIsDragging(false);
      window.dispatchEvent(new Event('resize'));
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, isProblemPaneCollapsed]);

  const handleResizePointerDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartXRef.current = e.clientX;
    dragStartWidthRef.current = sidebarWidth;
  };

  const handleResizeKeyDown = (e) => {
    const step = e.shiftKey ? 40 : 16;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setSidebarWidth((prev) => {
        const next = Math.min(600, prev + step);
        sessionStorage.setItem('intervai:sidebar_width', String(next));
        return next;
      });
      setTimeout(() => window.dispatchEvent(new Event('resize')), 50);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      setSidebarWidth((prev) => {
        const next = Math.max(280, prev - step);
        sessionStorage.setItem('intervai:sidebar_width', String(next));
        return next;
      });
      setTimeout(() => window.dispatchEvent(new Event('resize')), 50);
    } else if (e.key === 'Home') {
      e.preventDefault();
      setSidebarWidth(280);
      sessionStorage.setItem('intervai:sidebar_width', '280');
      setTimeout(() => window.dispatchEvent(new Event('resize')), 50);
    } else if (e.key === 'End') {
      e.preventDefault();
      setSidebarWidth(600);
      sessionStorage.setItem('intervai:sidebar_width', '600');
      setTimeout(() => window.dispatchEvent(new Event('resize')), 50);
    }
  };

  useEffect(() => {
    if (isCompany || !roomCode) return;
    const key = `intervai:preflight:${String(roomCode).toUpperCase()}`;
    if (sessionStorage.getItem(key) !== 'complete') {
      navigate(`/waiting/${String(roomCode).toUpperCase()}`, { replace: true });
    }
  }, [isCompany, roomCode, navigate]);

  useEffect(() => {
    let cancelled = false;

    async function loadInterview() {
      if (!roomCode) {
        setError('Interview room code is missing.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError('');

        console.log('[InterviewRoom] roomCode from URL:', roomCode);
        const response = await interviewApi.joinInterview(roomCode.trim());

        const actualInterview = response?.data?.interview;

        if (!actualInterview?._id) {
          throw new Error('Interview room could not be loaded.');
        }

        if (!cancelled) {
          if (!isCompany && !isInterviewActive(actualInterview.status)) {
            navigate(`/waiting/${actualInterview.roomCode}`);
            return;
          }
          setInterview(actualInterview);

          try {
            const questionResponse = await import('../api/apiClient').then(({ default: apiClient }) =>
              apiClient.get(`/questions/interview/${actualInterview._id}`)
            );
            const loadedQuestions = questionResponse?.data?.questions || [];
            setQuestions(loadedQuestions);
            if (loadedQuestions.length === 0) {
              setNoQuestions(true);
            }
          } catch (questionError) {
            console.warn('[InterviewRoom] Failed to load questions:', questionError);
            setQuestions([]);
            setNoQuestions(true);
          }

          try {
            const submissionResponse =
              await import('../api/codingApi').then(({ default: codingApi }) =>
                codingApi.getSubmissionsByInterview(actualInterview._id)
              );

            const submissions =
              submissionResponse?.data?.submissions || [];

            if (submissions.length > 0) {
              setAiFeedback(submissions[0].aiFeedback || null);
              setAiFeedbackStatus(submissions[0].aiFeedbackStatus || 'UNAVAILABLE');
            }
          } catch (submissionError) {
            console.warn(
              '[InterviewRoom] Failed to restore AI evaluation:',
              submissionError
            );
          }
        }
      } catch (err) {
        console.error('[InterviewRoom] Failed to load interview:', err);

        if (!cancelled) {
          setError(
            err?.response?.data?.message ||
              err?.message ||
              'Unable to load this interview room.'
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadInterview();

    return () => {
      cancelled = true;
    };
  }, [roomCode]);

  useEffect(() => {
    if (!interview?._id || isCompany) return;
    const timer = setInterval(async () => {
      try {
        const response = await interviewApi.getInterviewById(interview._id);
        const latest = response?.data?.interview;
        if (latest) {
          if (latest.status === 'COMPLETED' || latest.status === 'CANCELLED') {
            sessionStorage.removeItem(`intervai:preflight:${String(roomCode).toUpperCase()}`);
            navigate('/dashboard', { replace: true });
          } else if (latest.status !== interview.status) {
            setInterview((prev) => ({ ...prev, status: latest.status }));
          }
        }
      } catch (_) {}
    }, 5000);
    return () => clearInterval(timer);
  }, [interview?._id, interview?.status, isCompany, roomCode, navigate]);

  useEffect(() => {
    if (!socket || !roomCode || !interview?._id) return;

    const normalizedRoomCode = (interview?.roomCode || roomCode || '').toUpperCase();

    const payload = {
      roomId: normalizedRoomCode,
      interviewId: interview._id,
      userId: user?.id || user?._id,
      userName:
        user?.fullName ||
        (isCompany ? 'Company' : 'Student'),
    };

    const emitJoin = () => {
      console.log('[InterviewRoom] Socket room joined:', payload);
      socket.emit('join-room', payload);
    };

    emitJoin();

    socket.on('connect', emitJoin);

    return () => {
      socket.off('connect', emitJoin);
      socket.emit('leave-room', {
        roomId: normalizedRoomCode,
        interviewId: interview._id,
        userId: user?.id || user?._id,
        userName: user?.fullName,
      });
    };
  }, [socket, roomCode, interview?._id, user?.id, user?._id, isCompany]);

  useEffect(() => {
    if (!socket) return;
    const onQuestionChange = ({ questionIndex: nextIndex }) => setQuestionIndex(Number(nextIndex) || 0);
    socket.on('question:change', onQuestionChange);
    return () => socket.off('question:change', onQuestionChange);
  }, [socket]);

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-arena-bg text-slate-100">
        <LoadingSpinner />
        <div className="mt-2 text-sm text-slate-100">Loading interview room...</div>
      </div>
    );
  }

  if (error || !interview || noQuestions) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-arena-bg text-slate-800">
        <div className="max-w-md p-8 text-center bg-white rounded-2xl border border-arena-border shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">
            {noQuestions ? 'No questions configured' : 'Unable to open interview'}
          </h2>

          <p className="mt-2 text-xs text-rose-600 font-medium">
            {noQuestions ? 'No questions have been configured for this interview. Please wait for the company to add questions or create a new mock session.' : (error || 'Interview not found.')}
          </p>

          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="mt-5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const displayRoomCode =
    interview.roomCode?.toUpperCase() ||
    roomCode?.toUpperCase() ||
    'INT-DEMO';

  const participants = interview.participants || [];

  const currentQuestionData = questions[questionIndex] || null;
  const currentQuestion = currentQuestionData?.prompt || '';
  const expectedKeywords = currentQuestionData?.expectedKeywords || [];



  const handleComplete = async () => {
    if (!isCompany || ending) return;
    try {
      setEnding(true);
      const completion = await interviewApi.completeInterview(interview._id);
      if (!completion.data?.report) {
        try {
          const reportResponse = await (await import('../api/reportApi')).default.generateReport(interview._id);
          if (!reportResponse.data?.report) throw new Error('No report was returned.');
        } catch (reportError) {
          window.alert(`Interview completed, but the report could not be generated: ${reportError?.response?.data?.message || reportError?.message || 'Please retry from Reports.'}`);
        }
      }
      setIsEndModalOpen(false);
      navigate('/dashboard');
    } catch (err) {
      window.alert(err?.response?.data?.message || err?.message || 'Unable to complete interview.');
    } finally {
      setEnding(false);
    }
  };

  const rightTabs = isCompany
    ? [
        { id: 'video', label: 'Media', icon: Video },
        { id: 'copilot', label: 'AI Copilot', icon: Sparkles },
        { id: 'monitor', label: 'Proctor & Chat', icon: ShieldCheck },
        { id: 'evaluation', label: 'Scorecard', icon: FileText },
        { id: 'resume', label: 'Resume', icon: Briefcase },
      ]
    : [
        { id: 'video', label: 'Media', icon: Video },
        { id: 'monitor', label: 'Proctor & Chat', icon: ShieldCheck },
        { id: 'resume', label: 'Resume', icon: Briefcase },
      ];

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-[#F5F7FB] text-[#172033] font-sans relative">
      <RoomHeader
        roomCode={displayRoomCode}
        title={interview.title || 'Technical Interview'}
        durationMinutes={interview.durationMinutes || 60}
        participants={participants}
        isCompany={isCompany}
        editingState="granted"
        editorName={user?.fullName || 'You'}
        isProblemPaneCollapsed={isProblemPaneCollapsed}
        onToggleProblemPane={() => setIsProblemPaneCollapsed((prev) => !prev)}
        isRightSidebarCollapsed={isRightSidebarCollapsed}
        onToggleRightSidebar={() => setIsRightSidebarCollapsed((prev) => !prev)}
        onLeave={() => {
          if (!isCompany) sessionStorage.removeItem(`intervai:preflight:${displayRoomCode}`);
          navigate('/dashboard');
        }}
        onOpenEndModal={() => setIsEndModalOpen(true)}
        ending={ending}
        mediaStatus={mediaStatus}
        onOpenMediaTab={() => {
          setActiveRightTab('video');
          setIsRightSidebarCollapsed(false);
        }}
      />

      {interview.aiGenerationStatus === 'FALLBACK' && (
        <div
          role="status"
          className="shrink-0 border-b border-amber-200 bg-amber-50 px-4 py-1.5 text-xs text-amber-800"
        >
          {interview.aiGenerationMessage ||
            'AI question generation was unavailable; curated fallback questions are being used.'}
        </div>
      )}

      {/* Main 3-Region Workspace */}
      <div className="flex-1 flex overflow-hidden min-h-0 bg-[#F5F7FB]">
        {/* Left Region: Problem Pane (Collapsible) */}
        {!isProblemPaneCollapsed ? (
          <div className="w-[340px] xl:w-[380px] shrink-0 h-full border-r border-[#DFE5EF] bg-white overflow-hidden flex flex-col z-10 transition-all duration-200">
            <QuestionPane
              interview={interview}
              question={currentQuestionData}
              questionIndex={questionIndex}
              totalQuestions={questions.length}
              onNextQuestion={() => {
                const nextIdx = Math.min(questions.length - 1, questionIndex + 1);
                setQuestionIndex(nextIdx);
                socket?.emit('question:change', { roomId: displayRoomCode, questionIndex: nextIdx });
              }}
              onPrevQuestion={() => {
                const prevIdx = Math.max(0, questionIndex - 1);
                setQuestionIndex(prevIdx);
                socket?.emit('question:change', { roomId: displayRoomCode, questionIndex: prevIdx });
              }}
              onCollapse={() => setIsProblemPaneCollapsed(true)}
            />
          </div>
        ) : (
          <button
            onClick={() => setIsProblemPaneCollapsed(false)}
            className="w-6 h-20 my-auto bg-white border border-l-0 border-[#DFE5EF] text-[#596579] hover:text-[#172033] rounded-r-md flex flex-col items-center justify-center gap-1 shadow-xs hover:bg-[#F5F7FB] transition-all z-20 shrink-0"
            title="Expand Problem Description"
          >
            <PanelLeft size={12} />
            <span className="text-[8px] font-bold [writing-mode:vertical-lr] tracking-wider uppercase text-[#596579]">Problem</span>
          </button>
        )}

        {/* Center Region: Coding / Primary Canvas Workspace (Dominant) */}
        <div className="flex-1 min-w-[380px] h-full overflow-hidden flex flex-col">
          {currentQuestionData?.type === 'SYSTEM_DESIGN' ? (
            <SystemDesignCanvas
              interviewId={interview._id}
              question={currentQuestionData}
              socket={socket}
              roomCode={displayRoomCode}
              isCompany={isCompany}
              onSubmitted={(sysDesign) => setAiFeedback(sysDesign?.aiEvaluation)}
            />
          ) : currentQuestionData && currentQuestionData.type !== 'CODING' ? (
            isCompany ? (
              <div className="h-full flex flex-col items-center justify-center bg-white p-6 text-center select-none">
                <div className="w-12 h-12 rounded-full bg-[#EEF2F8] text-[#365FEA] flex items-center justify-center mb-3">
                  <FileText size={22} />
                </div>
                <h3 className="text-sm font-bold text-[#172033]">Candidate Response Area</h3>
                <p className="mt-1 text-xs text-[#596579] max-w-sm">
                  Waiting for candidate to submit their written answer. Live evaluation will appear automatically upon submission.
                </p>
              </div>
            ) : (
              <QuestionResponsePanel
                interviewId={interview._id}
                question={currentQuestionData}
                onAnswered={(data) => setAiFeedback(data.evaluation)}
              />
            )
          ) : (
            <EditorPane
              roomCode={displayRoomCode}
              interviewId={interview._id}
              interview={interview}
              question={currentQuestionData}
              onAiEvaluation={setAiFeedback}
              onAiEvaluationStatus={setAiFeedbackStatus}
            />
          )}
        </div>

        {isRightSidebarCollapsed && (
          <button
            onClick={() => setIsRightSidebarCollapsed(false)}
            className="w-6 h-20 my-auto bg-white border border-r-0 border-[#DFE5EF] text-[#596579] hover:text-[#172033] rounded-l-md flex flex-col items-center justify-center gap-1 shadow-xs hover:bg-[#F5F7FB] transition-all z-20 shrink-0"
            title="Expand Secondary Workspace"
          >
            <PanelRight size={12} />
            <span className="text-[8px] font-bold [writing-mode:vertical-lr] tracking-wider uppercase text-[#596579]">Widgets</span>
          </button>
        )}

        {/* Resizable Divider Handle (Left of Right Sidebar) */}
        {!isRightSidebarCollapsed && (
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize secondary widgets sidebar"
            aria-valuenow={sidebarWidth}
            aria-valuemin={280}
            aria-valuemax={600}
            tabIndex={0}
            onPointerDown={handleResizePointerDown}
            onKeyDown={handleResizeKeyDown}
            className={`w-1.5 h-full shrink-0 cursor-col-resize select-none relative z-20 group transition-colors focus:outline-none focus:ring-1 focus:ring-[#365FEA] ${
              isDragging ? 'bg-[#365FEA]' : 'bg-[#DFE5EF] hover:bg-[#365FEA]'
            }`}
            title="Drag to resize panel (or use Left/Right arrow keys)"
          >
            <div className="absolute inset-y-0 -left-1 -right-1 flex items-center justify-center pointer-events-none">
              <div
                className={`w-1 h-8 rounded-full transition-opacity ${
                  isDragging ? 'bg-white opacity-100' : 'bg-slate-400 opacity-0 group-hover:opacity-100'
                }`}
              />
            </div>
          </div>
        )}

        {/* Right Region: Secondary Workspace (Media, Copilot, Proctor & Chat, Scorecard, Resume) */}
        <div
          style={{ width: isRightSidebarCollapsed ? 0 : `${sidebarWidth}px` }}
          className={
            isRightSidebarCollapsed
              ? 'fixed -left-[9999px] top-0 h-px w-px overflow-hidden opacity-0 pointer-events-none'
              : 'shrink-0 h-full border-l border-[#DFE5EF] bg-white overflow-hidden flex flex-col z-10'
          }
        >
          {/* Tab Navigation Header */}
          <div className="h-10 px-2.5 border-b border-[#EEF2F8] bg-white flex items-center justify-between shrink-0 select-none">
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-1">
              {rightTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeRightTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveRightTab(tab.id)}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0 ${
                      isActive
                        ? 'bg-[#EEF2F8] text-[#365FEA] shadow-xs'
                        : 'text-[#596579] hover:text-[#172033] hover:bg-[#F5F7FB]'
                    }`}
                    title={tab.label}
                  >
                    <Icon size={13} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setIsRightSidebarCollapsed(true)}
              className="p-1 rounded-md hover:bg-[#F5F7FB] text-[#596579] hover:text-[#172033] transition-colors ml-1 shrink-0"
              title="Collapse sidebar for larger coding workspace"
            >
              <PanelRightClose size={15} />
            </button>
          </div>

          {/* Tab Content Panes (Kept mounted to preserve WebRTC & Proctoring state) */}
          <div className="flex-1 min-h-0 overflow-hidden relative bg-[#F8FAFC]">
            <div className={activeRightTab === 'video' ? 'h-full flex flex-col overflow-y-auto p-3' : 'hidden'}>
              <LiveInterviewPanel
                roomCode={displayRoomCode}
                isCompany={isCompany}
                onMediaStatusChange={setMediaStatus}
                onRegisterMediaControls={(ctrls) => { mediaControlsRef.current = ctrls; }}
              />
            </div>

            <div
              className={
                activeRightTab === 'monitor'
                  ? 'h-full flex flex-col overflow-hidden'
                  : isCompany
                  ? 'hidden'
                  : 'fixed -left-[9999px] top-0 h-px w-px overflow-hidden opacity-0 pointer-events-none'
              }
            >
              <MonitorPanel
                roomCode={displayRoomCode}
                interviewId={interview._id}
                interview={interview}
                aiFeedback={aiFeedback}
                aiFeedbackStatus={aiFeedbackStatus}
              />
            </div>

            {isCompany && (
              <div className={activeRightTab === 'copilot' ? 'h-full flex flex-col overflow-y-auto p-3' : 'hidden'}>
                <InterviewAssistantPanel
                  interviewId={interview._id}
                  currentQuestion={currentQuestion}
                  expectedKeywords={expectedKeywords}
                  interviewType={currentQuestionData?.type || 'TEXT'}
                  difficulty={currentQuestionData?.difficulty || 'MEDIUM'}
                  initialTurns={interview.adaptiveTurns || []}
                />
              </div>
            )}

            {isCompany && (
              <div className={activeRightTab === 'evaluation' ? 'h-full flex flex-col overflow-y-auto' : 'hidden'}>
                <InterviewReportPanel interviewId={interview._id} />
              </div>
            )}

            <div className={activeRightTab === 'resume' ? 'h-full flex flex-col overflow-y-auto p-3' : 'hidden'}>
              <ResumeUploadPanel
                interviewId={interview._id}
                isCompany={isCompany}
                onQuestionsGenerated={(newQs) => setQuestions((prev) => [...prev, ...newQs])}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Invisible overlay while dragging to prevent iframe/Monaco mouse interference */}
      {isDragging && <div className="fixed inset-0 z-50 cursor-col-resize select-none pointer-events-auto" />}

      {/* Confirmation Modal for Ending the Interview (Company only) */}
      <EndInterviewModal
        isOpen={isEndModalOpen}
        onClose={() => setIsEndModalOpen(false)}
        onConfirm={handleComplete}
        ending={ending}
      />
    </div>
  );
}
