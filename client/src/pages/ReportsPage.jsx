import React, { useEffect, useState } from 'react';
import { FileText, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AppShell from '../components/layout/AppShell';
import interviewApi from '../api/interviewApi';
import reportApi from '../api/reportApi';
import { isInterviewCompleted } from '../utils/interviewStatus';

export default function ReportsPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = async () => {
    try {
      setLoading(true); setError('');
      const response = await interviewApi.getInterviews();
      const interviews = response.data?.interviews || [];
      const completed = interviews.filter((x) => isInterviewCompleted(x.status));
      const reports = await Promise.all(completed.map(async (interview) => {
        try { const r = await reportApi.getReport(interview._id); return { interview, report: r.data?.report || null }; }
        catch (_) { return { interview, report: null }; }
      }));
      setRows(reports);
    } catch (e) { setError(e.message || 'Unable to load reports.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);
  return <AppShell><div className="ia-page"><div className="ia-page-head"><div><h1>Reports</h1><p>Review completed interview results and AI feedback.</p></div><button className="ia-outline-btn" onClick={load}><RefreshCw size={14}/> Refresh</button></div>{error && <div className="ia-error">{error}</div>}<div className="ia-card">{loading ? <div className="ia-empty">Loading reports...</div> : rows.length === 0 ? <div className="ia-empty"><FileText size={28}/><b>No completed reports yet.</b></div> : <div className="ia-session-list">{rows.map(({ interview, report }) => <div className="ia-session" key={interview._id}><div><b>{interview.title}</b><small>{interview.roomCode}</small></div><span className="ia-status done">{report ? `${report.overallScore ?? 0}/100` : 'Pending'}</span>{report && <button className="ia-small-btn" onClick={() => navigate(`/reports/${interview._id}`)}>Open report</button>}</div>)}</div>}</div></div></AppShell>;
}
