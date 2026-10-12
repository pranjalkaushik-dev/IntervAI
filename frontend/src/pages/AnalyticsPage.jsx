import React, { useEffect, useState } from 'react';
import {
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  Brain,
  Download,
  Code2,
} from 'lucide-react';
import interviewApi from '../api/interviewApi';

export default function AnalyticsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const download = () => {
    if (!data) return;
    const rows = [
      ['Student', 'Email', 'Submissions', 'Average Score', 'Violations'],
      ...(data.recentOutcomes || []).map((r) => [
        r.student,
        r.email,
        r.submissions,
        r.averageScore ?? '',
        r.violations || 0,
      ]),
    ];
    const csv = rows
      .map((row) =>
        row
          .map((v) => `"${String(v ?? '').replaceAll('"', '""')}"`)
          .join(',')
      )
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `intervai-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    interviewApi
      .getAnalytics()
      .then((r) => setData(r.data?.analytics || null))
      .catch((e) => setError(e?.response?.data?.message || e.message))
      .finally(() => setLoading(false));
  }, []);

  const avg = data?.averageScore;

  return (
    <div className="ia-page">
      <div className="ia-page-head">
        <div>
          <h1>Assessment Analytics</h1>
          <p>Real-time metrics calculated across verified submissions, AI scoring, and integrity telemetry.</p>
        </div>
        <button
          className="ia-outline-btn flex items-center gap-2"
          disabled={!data || !data?.totalInterviews}
          onClick={download}
        >
          <Download size={15} />
          <span>Export CSV</span>
        </button>
      </div>

      {error && <div className="ia-error mb-4">{error}</div>}

      {loading ? (
        <div className="ia-card ia-empty py-12">Loading assessment analytics…</div>
      ) : !data?.totalInterviews ? (
        <div className="ia-card ia-empty py-16 flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
            <TrendingUp size={24} />
          </div>
          <b className="text-base text-slate-800">No interview data collected yet</b>
          <span className="text-xs text-slate-500 max-w-sm mt-1">
            Conduct interviews and record candidate solutions to generate statistical benchmarks.
          </span>
        </div>
      ) : (
        <>
          <div className="ia-kpis">
            <Kpi
              n={avg == null ? '—' : `${avg}/100`}
              label="Avg Coding Score"
              icon={TrendingUp}
              tone="blue"
            />
            <Kpi
              n={data.averageOverallScore == null ? '—' : `${data.averageOverallScore}/100`}
              label="Avg Overall Score"
              icon={Brain}
              tone="purple"
            />
            <Kpi
              n={data.submissions ?? 0}
              label="Submissions"
              icon={Code2}
              tone="orange"
            />
            <Kpi
              n={data.completed ?? 0}
              label="Completed Sessions"
              icon={CheckCircle2}
              tone="green"
            />
            <Kpi
              n={data.violations ?? 0}
              label="Flagged Events"
              icon={AlertTriangle}
              tone="red"
            />
          </div>

          <div className="ia-card">
            <div className="ia-card-head">
              <div>
                <h3>Candidate Performance Outcomes</h3>
                <p>Aggregated results from sandbox executions and proctoring telemetry.</p>
              </div>
            </div>

            <div className="ia-table-wrap overflow-x-auto max-h-[500px] overflow-y-auto">
              <table className="ia-table">
                <thead className="sticky top-0 z-10 bg-[#F9FAFB] shadow-[0_1px_0_#E6E8EC]">
                  <tr>
                    <th>Candidate</th>
                    <th>Code Submissions</th>
                    <th>Average Score</th>
                    <th>Integrity Telemetry</th>
                  </tr>
                </thead>
                <tbody>
                  {!data.recentOutcomes || data.recentOutcomes.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="ia-empty">
                        No candidate submissions recorded yet.
                      </td>
                    </tr>
                  ) : (
                    data.recentOutcomes.map((r, i) => (
                      <tr key={i}>
                        <td>
                          <div className="font-semibold text-slate-900">{r.student}</div>
                          <div className="text-xs text-slate-500">{r.email}</div>
                        </td>
                        <td>{r.submissions}</td>
                        <td className="font-mono font-medium">
                          {r.averageScore == null ? '—' : `${r.averageScore}/100`}
                        </td>
                        <td>
                          <span className={`ia-status ${r.violations ? 'warning' : 'done'}`}>
                            {r.violations ? `${r.violations} flags` : 'Clean session'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Kpi({ n, label, icon: Icon, tone }) {
  return (
    <div className={`ia-kpi ${tone}`}>
      <div>
        <span>{label}</span>
        <b>{n}</b>
      </div>
      <i>
        <Icon size={19} />
      </i>
    </div>
  );
}
