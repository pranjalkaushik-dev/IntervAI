import React, { useEffect, useState } from 'react';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorAlert from '../components/common/ErrorAlert';
import { CheckCircle2, ChevronLeft, ChevronRight, StopCircle } from 'lucide-react';
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

export default function InterviewRoomPage() {
  const { roomCode } = useParams();
  const { user, isCompany } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();

  const [interview, setInterview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [aiFeedback, setAiFeedback] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [noQuestions, setNoQuestions] = useState(false);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [ending, setEnding] = useState(false);
  const [sidebarTab, setSidebarTab] = useState('assistant'); // 'assistant', 'resume'

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

            if (submissions.length > 0 && submissions[0]?.aiFeedback) {
              setAiFeedback(submissions[0].aiFeedback);
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
          setInterview(latest);
          if (latest.status === 'COMPLETED' || latest.status === 'CANCELLED') {
            sessionStorage.removeItem(`intervai:preflight:${String(roomCode).toUpperCase()}`);
            navigate('/dashboard', { replace: true });
          }
        }
      } catch (_) {}
    }, 5000);
    return () => clearInterval(timer);
  }, [interview?._id, isCompany, roomCode, navigate]);

  useEffect(() => {
    if (!socket || !roomCode || !interview) return;

    const normalizedRoomCode = roomCode.toUpperCase();

    const payload = {
      roomId: normalizedRoomCode,
      interviewId: interview._id,
      userId: user?.id || user?._id,
      userName:
        user?.fullName ||
        (isCompany ? 'Company' : 'Student'),
    };

    socket.emit('join-room', payload);

    console.log('[InterviewRoom] Socket room joined:', payload);

    return () => {
      socket.emit('leave-room', {
        roomId: normalizedRoomCode,
        interviewId: interview._id,
        userId: user?.id || user?._id,
        userName: user?.fullName,
      });
    };
  }, [socket, roomCode, interview, user, isCompany]);

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
      <div className="h-screen w-screen flex items-center justify-center bg-arena-bg text-slate-100">
        <div className="max-w-md p-6 text-center">
          <h2 className="text-lg font-bold text-white">
            {noQuestions ? 'No questions configured' : 'Unable to open interview'}
          </h2>

          <p className="mt-2 text-sm text-rose-400">
            {noQuestions ? 'No questions have been configured for this interview. Please wait for the company to add questions or create a new mock session.' : (error || 'Interview not found.')}
          </p>

          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="mt-5 px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-500 text-sm font-medium"
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
    const ok = window.confirm('End this interview and generate the final state?');
    if (!ok) return;
    try {
      setEnding(true);
      await interviewApi.completeInterview(interview._id);
      try { await (await import('../api/reportApi')).default.generateReport(interview._id); } catch (_) {}
      navigate('/dashboard');
    } catch (err) {
      window.alert(err?.response?.data?.message || err?.message || 'Unable to complete interview.');
    } finally {
      setEnding(false);
    }
  };

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-arena-bg text-slate-100 font-sans">
      <RoomHeader
        roomCode={displayRoomCode}
        title={interview.title || 'Technical Interview'}
        durationMinutes={interview.durationMinutes || 60}
        participants={participants}
        isCompany={isCompany}
        editingState="granted"
        editorName={user?.fullName || 'You'}
        onLeave={() => { if (!isCompany) sessionStorage.removeItem(`intervai:preflight:${displayRoomCode}`); navigate('/dashboard'); }}
      />

      {questions.length > 0 && (
        <div className="h-10 shrink-0 border-b border-arena-border bg-arena-surface px-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider text-arena-dim">Question</span>
            <div className="flex items-center gap-1">
              <button disabled={questionIndex === 0} onClick={() => { const n = Math.max(0, questionIndex - 1); setQuestionIndex(n); socket?.emit('question:change', { roomId: displayRoomCode, questionIndex: n }); }} className="p-1 rounded border border-arena-border disabled:opacity-30"><ChevronLeft size={13}/></button>
              <span className="text-xs font-mono text-white">{questionIndex + 1} / {questions.length}</span>
              <button disabled={questionIndex === questions.length - 1} onClick={() => { const n = Math.min(questions.length - 1, questionIndex + 1); setQuestionIndex(n); socket?.emit('question:change', { roomId: displayRoomCode, questionIndex: n }); }} className="p-1 rounded border border-arena-border disabled:opacity-30"><ChevronRight size={13}/></button>
            </div>
            <span className="text-[10px] text-arena-dim">{currentQuestionData?.type || ''} • {currentQuestionData?.difficulty || ''}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSidebarTab(sidebarTab === 'resume' ? 'assistant' : 'resume')}
              className={`text-[10px] font-semibold px-2 py-1 rounded border transition-colors ${sidebarTab === 'resume' ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-600'}`}
            >
              📄 {sidebarTab === 'resume' ? 'Back to Assistant' : 'Resume & File Upload'}
            </button>
            {isCompany && <button onClick={handleComplete} disabled={ending} className="px-2.5 py-1 rounded-md bg-rose-600/90 text-white text-[10px] font-semibold flex items-center gap-1.5 disabled:opacity-50"><StopCircle size={12}/>{ending ? 'Ending…' : 'End Interview'}</button>}
          </div>
        </div>
      )}

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        <div className="hidden lg:block lg:col-span-3 h-full overflow-hidden border-r border-arena-border">
          <QuestionPane interview={interview} question={currentQuestionData} />
        </div>

        <div className="col-span-1 lg:col-span-6 h-full overflow-hidden">
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
            <QuestionResponsePanel interviewId={interview._id} question={currentQuestionData} onAnswered={(data) => setAiFeedback(data.evaluation)} />
          ) : (
            <EditorPane
              roomCode={displayRoomCode}
              interviewId={interview._id}
              interview={interview}
              question={currentQuestionData}
              onAiEvaluation={setAiFeedback}
            />
          )}
        </div>

        <div className="hidden lg:flex lg:col-span-3 h-full overflow-hidden border-l border-arena-border flex-col overflow-y-auto">
          {sidebarTab === 'resume' ? (
            <div className="p-3">
              <ResumeUploadPanel
                interviewId={interview._id}
                isCompany={isCompany}
                onQuestionsGenerated={(newQs) => setQuestions(prev => [...prev, ...newQs])}
              />
            </div>
          ) : (
            <>
              <LiveInterviewPanel roomCode={displayRoomCode} isCompany={isCompany} />
              {!isCompany && <MonitorPanel roomCode={displayRoomCode} interviewId={interview._id} interview={interview} aiFeedback={aiFeedback} />}
              {isCompany && <>
                <InterviewAssistantPanel currentQuestion={currentQuestion} expectedKeywords={expectedKeywords} interviewType={currentQuestionData?.type || 'TEXT'} difficulty={currentQuestionData?.difficulty || 'MEDIUM'} />
                <MonitorPanel roomCode={displayRoomCode} interviewId={interview._id} interview={interview} aiFeedback={aiFeedback} />
                <InterviewReportPanel interviewId={interview._id} />
              </>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
