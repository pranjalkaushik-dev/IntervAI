import React, { useRef, useState } from 'react';
import { Mic, MicOff, Volume2 } from 'lucide-react';
import reportApi from '../../api/reportApi';
import apiClient from '../../api/apiClient';
import { useSocket } from '../../context/SocketContext';

export default function QuestionResponsePanel({ interviewId, question, onAnswered }) {
  const [answer, setAnswer] = useState('');
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);
  const [answerId, setAnswerId] = useState(null);
  const { socket } = useSocket();
  const [feedback, setFeedback] = useState(null); const [listening, setListening] = useState(false); const recognitionRef = useRef(null);
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
      if (!answerId || String(payload?.answerId) !== String(answerId)) return;
      setFeedback(payload.evaluation || null);
      setBusy(false);
    };
    socket.on('answer:evaluated', onEvaluated);
    return () => socket.off('answer:evaluated', onEvaluated);
  }, [socket, interviewId, answerId]);

  const submit = async () => {
    const value = question?.type === 'MCQ' ? String(selected ?? '') : answer.trim();
    if (!value) return;
    try {
      setBusy(true);
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
      setAnswerId(data.answerId);
      setFeedback(data.evaluation);
      onAnswered?.(data);
      setAnswer(''); setSelected(null);
    } catch (e) { 
      setBusy(false);
      setFeedback({ summary: e.response?.data?.message || e.message || 'Error submitting answer' }); 
    }
  };
  return <div className="h-full p-5 overflow-y-auto bg-arena-bg">
    <div className="max-w-3xl mx-auto">
      <div className="text-[10px] uppercase tracking-wider text-arena-dim">{question?.type || 'TEXT'} • {question?.difficulty || 'MEDIUM'}</div>
      <h2 className="mt-2 text-lg font-bold text-white">{question?.prompt}</h2>
      {question?.type === 'MCQ' ? <div className="mt-6 space-y-2">{(question.options || []).map((option, i) => <button key={i} onClick={() => setSelected(i)} className={`w-full text-left p-3 rounded-md border text-sm ${selected === i ? 'border-blue-500 bg-blue-500/10 text-white' : 'border-arena-border text-slate-300'}`}>{String.fromCharCode(65+i)}. {option}</button>)}</div> : <textarea value={answer} onChange={e=>setAnswer(e.target.value)} rows={12} placeholder="Explain your approach clearly..." className="mt-6 w-full rounded-md border border-arena-border bg-arena-panel p-4 text-sm text-white outline-none focus:border-blue-500"/>}
      <div className="mt-4 flex gap-2"><button type="button" onClick={toggleVoice} className="px-3 py-2 rounded-md border border-arena-border text-xs">{listening ? <MicOff size={14} className="inline mr-1"/> : <Mic size={14} className="inline mr-1"/>}{listening ? 'Stop voice' : 'Voice answer'}</button><button type="button" onClick={()=>speak(question?.prompt)} className="px-3 py-2 rounded-md border border-arena-border text-xs"><Volume2 size={14} className="inline mr-1"/>Read question</button></div><button disabled={busy || (question?.type === 'MCQ' ? selected === null : !answer.trim())} onClick={submit} className="mt-4 px-4 py-2 rounded-md bg-blue-600 text-sm font-semibold disabled:opacity-40">{busy ? 'AI evaluating…' : 'Submit Answer'}</button>
      {feedback && <div className="mt-5 rounded-lg border border-arena-border bg-arena-panel p-4"><div className="grid grid-cols-2 gap-2"><Metric label="Technical" value={feedback.technicalScore}/><Metric label="Communication" value={feedback.communicationScore}/></div><p className="mt-3 text-sm text-slate-300">{feedback.summary}</p><button type="button" onClick={()=>speak(feedback.summary)} className="mt-2 text-[10px] text-blue-400"><Volume2 size={12} className="inline mr-1"/>Read AI feedback aloud</button></div>}
    </div>
  </div>;
}
function Metric({label,value}){return <div className="rounded bg-arena-bg p-3"><span className="text-[10px] text-arena-dim">{label}</span><b className="block mt-1 text-lg text-white">{value ?? 0}/100</b></div>}
