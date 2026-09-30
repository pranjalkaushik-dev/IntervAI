import React, { useEffect, useState } from 'react';
import { FileText, Save, Sparkles } from 'lucide-react';
import reportApi from '../../api/reportApi';
import questionApi from '../../api/questionApi';

export default function InterviewReportPanel({ interviewId }) {
  const [report, setReport] = useState(null); const [interview, setInterview] = useState(null);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const load = async () => { try { const r = await reportApi.getReport(interviewId); setReport(r.data?.report || null); setInterview(r.data?.interview || null); setNotes(r.data?.interview?.companyNotes || ''); } catch (_) {} };
  useEffect(() => { load(); }, [interviewId]);
  const generate = async () => { setBusy(true); try { const r = await reportApi.generateReport(interviewId); setReport(r.data?.report); } finally { setBusy(false); } };
  const generateResumeQuestions = async () => { const skills = interview?.studentResume?.skills || []; if (!skills.length) return; setBusy(true); try { await questionApi.generateWithAI({ role:'Student Resume Profile', skills, difficulty:'MEDIUM', type:'TEXT', numberOfQuestions:4, interviewId, save:true }); alert('Resume-based questions generated and saved. Refresh the interview to load them.'); } finally { setBusy(false); } };
  const saveNotes = async () => { setBusy(true); try { await reportApi.saveNotes(interviewId, notes); } finally { setBusy(false); } };
  return <section className="border-t border-arena-border bg-arena-panel p-3 overflow-y-auto max-h-[46%]">
    <div className="flex items-center justify-between"><div><div className="text-[10px] uppercase tracking-wider text-arena-dim">Post Interview</div><h3 className="text-sm font-bold text-white">Evaluation & Notes</h3></div><button onClick={generate} disabled={busy} className="px-2.5 py-1.5 rounded bg-blue-600 text-[10px] font-semibold"><Sparkles size={12} className="inline mr-1"/>{busy?'Working…':'Generate Report'}</button></div>
    <textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Company notes…" rows={3} className="mt-3 w-full rounded border border-arena-border bg-arena-bg p-2 text-xs text-white"/><button onClick={generateResumeQuestions} disabled={!interview?.studentResume?.skills?.length} className="mt-1 ml-1 px-2 py-1 rounded border border-arena-border text-[10px] disabled:opacity-40"><Sparkles size={11} className="inline mr-1"/>Resume Questions</button><button onClick={saveNotes} className="mt-1 px-2 py-1 rounded border border-arena-border text-[10px]"><Save size={11} className="inline mr-1"/>Save Notes</button>
    {report && <div className="mt-3 space-y-3"><div className="grid grid-cols-2 gap-2">{[['Overall',report.overallScore],['Technical',report.technicalScore],['Coding',report.codingScore],['Communication',report.communicationScore]].map(([k,v])=><div key={k} className="rounded bg-arena-bg p-2"><span className="text-[9px] text-arena-dim">{k}</span><b className="block text-sm text-white">{v}/100</b></div>)}</div><div className="text-[10px] text-slate-300">Tests: {report.testsPassed}/{report.testsTotal} passed • Violations: {report.violations}</div><p className="text-xs text-slate-300">{report.aiSummary}</p><div className="text-[10px] text-arena-dim">Resume profile: {(report?.resumeSkills || []).join(', ') || 'not attached'}</div><div className="grid grid-cols-2 gap-2 text-[10px]"><div><b className="text-emerald-400">Strengths</b>{(report.strengths||[]).map((x,i)=><div key={i} className="mt-1 text-slate-300">• {x}</div>)}</div><div><b className="text-amber-400">Improve</b>{(report.improvements||[]).map((x,i)=><div key={i} className="mt-1 text-slate-300">• {x}</div>)}</div></div></div>}
  </section>;
}
