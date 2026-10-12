import React, { useRef, useState } from 'react';
import { Mic, MicOff, Volume2 } from 'lucide-react';
import apiClient from '../../api/apiClient';
import { useSocket } from '../../context/SocketContext';

export default function QuestionResponsePanel({ interviewId, question, onAnswered }) {
  const [answer, setAnswer] = useState('');
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);
  const [answerId, setAnswerId] = useState(null);
  const { socket } = useSocket();
  const [feedback, setFeedback] = useState(null); const [listening, setListening] = useState(false); const recognitionRef = useRef(null);
  const pendingEvaluationsRef = useRef(new Map());
  const answerIdRef = useRef(null);
  const awaitingAnswerRef = useRef(false);
  const toggleVoice = () => {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) { setFeedback({ summary: 'Voice input is not supported by this browser. You can still type your answer.' }); return; }
    if (listening) { recognitionRef.current?.stop(); setListening(false); return; }
    const recognition = new Recognition(); recognition.lang = 'en-US'; recognition.interimResults = false; recognition.onresult = e => setAnswer(prev => `${prev}${prev ? ' ' : ''}${e.results[0][0].transcript}`); recognition.onerror = () => setListening(false); recognition.onend = () => setListening(false); recognitionRef.current = recognition; recognition.start(); setListening(true);
  };
  const speak = (text) => { if ('speechSynthesis' in window && text) { window.speechSynthesis.cancel(); window.speechSynthesis.speak(new SpeechSynthesisUtterance(text)); } };

  React.useEffect(() => {
    if (!socket || !interviewId) return undefined;
    const onEvaluated = (payload) => {
      if (String(payload?.interviewId) !== String(interviewId) || !payload?.answerId) return;
      const activeAnswerId = answerIdRef.current;
      if (!activeAnswerId && awaitingAnswerRef.current) {
        pendingEvaluationsRef.current.set(String(payload.answerId), payload.evaluation || null);
        return;
      }
      if (!activeAnswerId) return;
      if (String(payload.answerId) !== String(activeAnswerId)) return;
      setFeedback(payload.evaluation || null);
      setBusy(false);
    };
    socket.on('answer:evaluated', onEvaluated);
    return () => socket.off('answer:evaluated', onEvaluated);
  }, [socket, interviewId]);

  React.useEffect(() => {
    answerIdRef.current = answerId;
    if (!answerId) return;
    const earlyEvaluation = pendingEvaluationsRef.current.get(String(answerId));
    if (earlyEvaluation) {
      setFeedback(earlyEvaluation);
      setBusy(false);
      pendingEvaluationsRef.current.delete(String(answerId));
    }
  }, [answerId]);

  React.useEffect(() => {
    answerIdRef.current = null;
    awaitingAnswerRef.current = false;
    pendingEvaluationsRef.current.clear();
    setAnswerId(null);
    setFeedback(null);
    setAnswer('');
    setSelected(null);
    setBusy(false);
  }, [question?._id]);

  const submit = async () => {
    const value = question?.type === 'MCQ' ? String(selected ?? '') : answer.trim();
    if (!value) return;
    try {
      setBusy(true);
      awaitingAnswerRef.current = true;
      setFeedback({ summary: "Answer submitted. AI evaluation is running..." });
      const response = await apiClient.post(`/interviews/${interviewId}/text-submit`, {
        questionId: question._id,
        question: question.prompt,
        candidateAnswer: value,
        expectedKeywords: question.expectedKeywords || [],
        type: question.type || 'TEXT',
        difficulty: question.difficulty || 'MEDIUM'
      });
      const data = response.data || {};
      awaitingAnswerRef.current = false;
      answerIdRef.current = data.answerId;
      setAnswerId(data.answerId);
      setFeedback(data.evaluation);
      const earlyEvaluation = pendingEvaluationsRef.current.get(String(data.answerId));
      if (earlyEvaluation) {
        setFeedback(earlyEvaluation);
        setBusy(false);
        pendingEvaluationsRef.current.delete(String(data.answerId));
      }
      onAnswered?.(data);
      setAnswer(''); setSelected(null);
    } catch (e) { 
      awaitingAnswerRef.current = false;
      setBusy(false);
      setFeedback({
        evaluationStatus: 'REQUEST_FAILED',
        summary: e.response?.data?.message || e.message || 'Error submitting answer',
      });
    }
  };
  return (
    <div className="h-full p-6 overflow-y-auto bg-arena-bg">
      <div className="max-w-3xl mx-auto bg-white p-6 rounded-2xl border border-arena-border shadow-sm">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          {question?.type || 'TEXT'} • {question?.difficulty || 'MEDIUM'}
        </div>
        <h2 className="mt-2 text-lg font-bold text-slate-900 leading-snug">{question?.prompt}</h2>

        {question?.type === 'MCQ' ? (
          <div className="mt-6 space-y-2.5">
            {(question.options || []).map((option, i) => (
              <button
                key={i}
                onClick={() => setSelected(i)}
                className={`w-full text-left p-3.5 rounded-xl border text-sm transition-all ${
                  selected === i
                    ? 'border-blue-600 bg-blue-50 text-blue-700 font-semibold shadow-sm'
                    : 'border-slate-200 bg-slate-50/60 hover:bg-white hover:border-slate-300 text-slate-800'
                }`}
              >
                <span className="inline-block w-6 font-bold">{String.fromCharCode(65 + i)}.</span>
                {option}
              </button>
            ))}
          </div>
        ) : (
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            rows={10}
            placeholder="Explain your approach clearly and detail your thought process..."
            className="mt-6 w-full rounded-xl border border-slate-300 bg-white p-4 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-sm"
          />
        )}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={toggleVoice}
            className="px-3 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 transition-colors"
          >
            {listening ? <MicOff size={14} className="inline mr-1 text-rose-600" /> : <Mic size={14} className="inline mr-1 text-blue-600" />}
            {listening ? 'Stop voice' : 'Voice answer'}
          </button>
          <button
            type="button"
            onClick={() => speak(question?.prompt)}
            className="px-3 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 transition-colors"
          >
            <Volume2 size={14} className="inline mr-1 text-blue-600" />
            Read question
          </button>
        </div>

        <button
          disabled={busy || (question?.type === 'MCQ' ? selected === null : !answer.trim())}
          onClick={submit}
          className="mt-4 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm disabled:opacity-40 transition-colors"
        >
          {busy ? 'AI evaluating…' : 'Submit Answer'}
        </button>

        {feedback && (
          <div className="mt-6 rounded-xl border border-arena-border bg-slate-50 p-5">
            {feedback.evaluationStatus === 'COMPLETED' ? (
              <div className="grid grid-cols-2 gap-3">
                <Metric label="Technical Depth" value={feedback.technicalScore} />
                <Metric label="Communication" value={feedback.communicationScore} />
              </div>
            ) : (
              <div
                role="status"
                className={`text-xs font-medium ${
                  feedback.evaluationStatus === 'FAILED' || feedback.evaluationStatus === 'REQUEST_FAILED'
                    ? 'text-rose-600'
                    : 'text-blue-600'
                }`}
              >
                {feedback.evaluationStatus === 'FAILED'
                  ? 'AI evaluation unavailable'
                  : feedback.evaluationStatus === 'REQUEST_FAILED'
                  ? 'Answer submission failed'
                  : 'AI evaluation is running…'}
              </div>
            )}
            <p className="mt-3 text-sm text-slate-700 leading-relaxed">{feedback.summary}</p>
            {feedback.evaluationStatus === 'COMPLETED' && (
              <button
                type="button"
                onClick={() => speak(feedback.summary)}
                className="mt-2.5 text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <Volume2 size={13} />
                <span>Read AI feedback aloud</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="rounded-lg bg-white border border-slate-200 p-3 text-center shadow-xs">
      <span className="text-[10px] font-medium text-slate-500 uppercase">{label}</span>
      <b className="block mt-1 text-lg font-bold text-slate-900">{value ?? 0}/100</b>
    </div>
  );
}
