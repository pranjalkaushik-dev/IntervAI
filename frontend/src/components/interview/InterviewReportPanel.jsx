import React, { useCallback, useEffect, useState } from 'react';
import { FileText, Save, Sparkles } from 'lucide-react';
import reportApi from '../../api/reportApi';
import questionApi from '../../api/questionApi';

export default function InterviewReportPanel({ interviewId }) {
  const [report, setReport] = useState(null);
  const [interview, setInterview] = useState(null);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    try {
      const response = await reportApi.getReport(interviewId);
      setReport(response.data?.report || null);
      setInterview(response.data?.interview || null);
      setNotes(response.data?.interview?.companyNotes || '');
      setError('');
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Unable to load interview report.');
    }
  }, [interviewId]);

  useEffect(() => {
    load();
  }, [load]);

  const generate = async () => {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const response = await reportApi.generateReport(interviewId);
      setReport(response.data?.report || null);
      if (response.data?.report?.aiSummaryStatus !== 'COMPLETED') {
        setMessage('Report metrics were saved, but the AI summary is unavailable.');
      }
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Unable to generate report.');
    } finally {
      setBusy(false);
    }
  };

  const generateResumeQuestions = async () => {
    const resume = interview?.studentResume || {};
    const skills = [...(resume.skills || []), ...(resume.technologies || [])];
    const questionSkills = (skills.length ? skills : (resume.projects || [])).slice(0, 5);
    if (!questionSkills.length) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await questionApi.generateWithAI({
        role: 'Student Resume Profile',
        skills: questionSkills,
        difficulty: 'MEDIUM',
        type: 'TEXT',
        numberOfQuestions: 4,
        interviewId,
        save: true,
      });
      setMessage('Resume-based questions were generated and saved. Refresh the interview to load them.');
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Unable to generate resume-based questions.');
    } finally {
      setBusy(false);
    }
  };

  const saveNotes = async () => {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await reportApi.saveNotes(interviewId, notes);
      setMessage('Interviewer notes saved.');
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Unable to save interviewer notes.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="border-t border-arena-border bg-white p-3.5 overflow-y-auto max-h-[46%]">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Post Interview</div>
          <h3 className="text-sm font-bold text-slate-900">Evaluation &amp; Notes</h3>
        </div>
        <button onClick={generate} disabled={busy} className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-semibold shadow-sm disabled:opacity-50 transition-colors">
          <Sparkles size={12} className="inline mr-1" />{busy ? 'Working…' : 'Generate Report'}
        </button>
      </div>

      <textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Interviewer evaluation notes…" rows={3} className="mt-3 w-full rounded-lg border border-slate-300 bg-slate-50 p-2 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-600 outline-none" />
      <div className="mt-1 flex items-center gap-1.5">
        <button onClick={saveNotes} disabled={busy} className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-[10px] font-semibold text-slate-700 disabled:opacity-40 transition-colors">
          <Save size={11} className="inline mr-1" />Save Notes
        </button>
        <button onClick={generateResumeQuestions} disabled={busy || !(interview?.studentResume?.skills?.length || interview?.studentResume?.projects?.length)} className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-[10px] font-semibold text-slate-700 disabled:opacity-40 transition-colors">
          <Sparkles size={11} className="inline mr-1" />Resume Questions
        </button>
      </div>

      {error && <p role="alert" className="mt-2 text-xs text-rose-600 font-medium bg-rose-50 p-2 rounded border border-rose-200">{error}</p>}
      {message && <p role="status" className="mt-2 text-xs text-amber-700 font-medium bg-amber-50 p-2 rounded border border-amber-200">{message}</p>}

      {report && (
        <div className="mt-3 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {[
              ['Overall', report.overallScore],
              ['Technical', report.technicalScore],
              ['Coding', report.codingScore],
              ['Communication', report.communicationScore],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg bg-slate-50 border border-slate-200 p-2 text-center">
                <span className="text-[9px] font-medium text-slate-500 uppercase">{label}</span>
                <b className="block text-sm font-bold text-slate-900 mt-0.5">{value}/100</b>
              </div>
            ))}
          </div>
          <div className="text-[10px] text-slate-600 font-medium">Tests: {report.testsPassed}/{report.testsTotal} passed • Violations: {report.violations}</div>
          <div className="flex items-center gap-1 text-[10px] text-slate-500">
            <FileText size={12} />
            {report.aiSummaryStatus === 'COMPLETED' ? 'AI-generated summary' : 'Metrics-based summary; AI summary unavailable'}
          </div>
          <p className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-200 leading-relaxed">{report.aiSummary}</p>
          <div className="text-[10px] text-slate-500">Resume profile: {(report.resumeSkills || []).join(', ') || 'not attached'}</div>
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div className="p-2 rounded-lg bg-emerald-50/50 border border-emerald-100">
              <b className="text-emerald-700 font-semibold block mb-1">Strengths</b>
              {(report.strengths || []).map((item, index) => <div key={index} className="text-slate-700">• {item}</div>)}
            </div>
            <div className="p-2 rounded-lg bg-amber-50/50 border border-amber-100">
              <b className="text-amber-700 font-semibold block mb-1">Improve</b>
              {(report.improvements || []).map((item, index) => <div key={index} className="text-slate-700">• {item}</div>)}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
