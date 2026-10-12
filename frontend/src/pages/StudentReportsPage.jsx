import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import interviewApi from '../api/interviewApi';
import reportApi from '../api/reportApi';
import { BarChart3, Calendar, Search } from 'lucide-react';

export default function StudentReportsPage() {
  const nav = useNavigate();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await interviewApi.getInterviews();
      const list = res.data?.interviews || [];
      
      const completedList = list.filter(x => x.status === 'COMPLETED');
      
      const reportEntries = await Promise.all(
        completedList.map(async x => {
          try {
            const rr = await reportApi.getReport(x._id);
            return { interview: x, report: rr.data?.report };
          } catch (_) {
            return { interview: x, report: null };
          }
        })
      );
      
      // Filter out those without actual reports generated yet
      setReports(reportEntries.filter(entry => entry.report));
    } catch (e) {
      setError(e.message || 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load() }, []);

  const rows = reports.filter(x => 
    (x.interview.title || '').toLowerCase().includes(query.toLowerCase()) || 
    (x.interview.roomCode || '').toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="ia-page">
      <div className="ia-page-head">
        <div>
          <h1>My Reports</h1>
          <p>Review your interview performance, scores, and feedback.</p>
        </div>
      </div>

      {error && <div className="ia-error">{error}</div>}

      <div className="ia-card">
        <div className="ia-card-head">
          <div>
            <h3>Completed Interview Reports</h3>
          </div>
          <div className="ia-table-tools">
            <div className="ia-search">
              <Search size={16} />
              <input placeholder="Search reports..." value={query} onChange={e => setQuery(e.target.value)} />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="ia-empty">Loading reports...</div>
        ) : (
          <div className="ia-table-wrap">
            <table className="ia-table">
              <thead>
                <tr>
                  <th>Interview</th>
                  <th>Date</th>
                  <th>Overall Score</th>
                  <th>Coding / Tech</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr><td colSpan="5" className="ia-empty">No reports found.</td></tr>
                ) : rows.map((x, i) => (
                  <tr key={x.interview._id || i}>
                    <td><b>{x.interview.title}</b><small>{x.interview.roomCode}</small></td>
                    <td>
                      <b>{x.interview.scheduledAt ? new Date(x.interview.scheduledAt).toLocaleDateString() : '—'}</b>
                    </td>
                    <td>
                      <span className="ia-status done">{x.report.overallScore}/100</span>
                    </td>
                    <td>
                      <small>Coding: {x.report.codingScore}/100</small><br />
                      <small>Tech: {x.report.technicalScore}/100</small>
                    </td>
                    <td>
                      <button className="ia-small-btn" onClick={() => nav('/report/' + x.interview._id)}>
                        <BarChart3 size={13} /> View Detail
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
