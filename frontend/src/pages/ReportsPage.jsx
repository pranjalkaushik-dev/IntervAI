import React, { useEffect, useState } from 'react';
import { FileText, RefreshCw, ArrowRight } from 'lucide-react';
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
      setLoading(true);
      setError('');
      const response = await interviewApi.getInterviews();
      const interviews = response.data?.interviews || [];
      const completed = interviews.filter((x) => isInterviewCompleted(x.status));
      const reports = await Promise.all(
        completed.map(async (interview) => {
          try {
            const r = await reportApi.getReport(interview._id);
            return { interview, report: r.data?.report || null };
          } catch (_) {
            return { interview, report: null };
          }
        })
      );
      setRows(reports);
    } catch (e) {
      setError(e?.response?.data?.message || e.message || 'Unable to load reports.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <AppShell>
      <div className="ia-page">
        <div className="ia-page-head">
          <div>
            <h1>Performance Reports</h1>
            <p>Review completed candidate assessments, AI score breakdowns, and integrity reports.</p>
          </div>
          <button className="ia-outline-btn flex items-center gap-1.5" onClick={load}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        {error && <div className="ia-error mb-4">{error}</div>}

        <div className="ia-card">
          {loading ? (
            <div className="ia-empty py-12">Loading assessment reports…</div>
          ) : rows.length === 0 ? (
            <div className="ia-empty py-16 flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
                <FileText size={24} />
              </div>
              <b className="text-base text-slate-800">No completed reports yet</b>
              <span className="text-xs text-slate-500 max-w-sm mt-1">
                Completed interview sessions automatically generate detailed scoring summaries here.
              </span>
            </div>
          ) : (
            <div className="ia-session-list">
              {rows.map(({ interview, report }) => (
                <div className="ia-session" key={interview._id}>
                  <div>
                    <b>{interview.title}</b>
                    <small>Room: {interview.roomCode} • Duration: {interview.durationMinutes || 60}m</small>
                  </div>
                  <span className={`ia-status ${report ? 'done' : 'scheduled'}`}>
                    {report ? `${report.overallScore ?? 0}/100` : 'Pending Score'}
                  </span>
                  {report && (
                    <button
                      className="ia-small-btn flex items-center gap-1"
                      onClick={() => navigate(`/reports/${interview._id}`)}
                    >
                      <span>Open Report</span>
                      <ArrowRight size={12} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
