import React, { useEffect, useState } from 'react';
import { isInterviewActive, isInterviewCompleted, normalizeInterviewStatus } from '../utils/interviewStatus';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import interviewApi from '../api/interviewApi';
import reportApi from '../api/reportApi';
import { Calendar, Code2, Search, PlayCircle, Square, MoreHorizontal } from 'lucide-react';

export default function InterviewsPage() {
  const { isCompany, isAdmin } = useAuth();
  const nav = useNavigate();
  const [searchParams] = useSearchParams();
  const [interviews, setInterviews] = useState([]);
  const [reports, setReports] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState(searchParams.get('search') || '');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await interviewApi.getInterviews();
      const list = res.data?.interviews || [];
      setInterviews(list);
      
      if (!isCompany && !isAdmin) {
        // Fetch reports for completed interviews for students
        const entries = await Promise.all(
          list.filter(x => isInterviewCompleted(x.status)).map(async x => {
            try {
              const rr = await reportApi.getReport(x._id);
              return [x._id, rr.data?.report];
            } catch (_) {
              return [x._id, null];
            }
          })
        );
        setReports(Object.fromEntries(entries));
      }
    } catch (e) {
      setError(e.message || 'Failed to load interviews');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load() }, []);

  const start = async id => {
    try {
      await interviewApi.startInterview(id);
      await load();
    } catch (e) {
      setError(e.message || 'Failed to start interview');
    }
  };

  const complete = async id => {
    try {
      await interviewApi.completeInterview(id);
      await load();
    } catch (e) {
      setError(e.message || 'Failed to complete interview');
    }
  };

  const rows = interviews.filter((x) => {
    const q = query.toLowerCase();
    const student = (x.participants || []).find((p) => p.role === 'STUDENT');
    const studentName = student?.user?.fullName || '';
    const studentEmail = student?.user?.email || '';
    return (
      (x.title || '').toLowerCase().includes(q) ||
      (x.roomCode || '').toLowerCase().includes(q) ||
      studentName.toLowerCase().includes(q) ||
      studentEmail.toLowerCase().includes(q)
    );
  });

  return (
    <div className="ia-page ia-panel-page">
      <div className="ia-page-head ia-panel-head">
        <div>
          <h1>{isCompany || isAdmin ? 'Tests & Interviews' : 'My Tests'}</h1>
          <p>{isCompany || isAdmin ? 'Manage your scheduled and past interview sessions.' : 'View your upcoming interviews and past results.'}</p>
        </div>
        {isCompany && (
          <button
            type="button"
            className="h-9 px-4 rounded-lg bg-[#365FEA] hover:bg-[#2B4DC7] text-xs font-semibold text-white flex items-center gap-2 shadow-sm transition-all"
            onClick={() => nav('/interviews/create')}
          >
            <span>Create Interview</span>
          </button>
        )}
      </div>

      {error && <div className="ia-error shrink-0">{error}</div>}

      <div className="ia-card ia-panel-card">
        <div className="ia-card-head ia-panel-card-head">
          <div>
            <h3>All Interviews <span className="ia-count">{rows.length}</span></h3>
          </div>
          <div className="ia-table-tools">
            <div className="ia-search">
              <Search size={16} />
              <input placeholder="Search interviews..." value={query} onChange={e => setQuery(e.target.value)} />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="ia-empty">Loading interviews...</div>
        ) : (
          isCompany || isAdmin ? (
            <div className="ia-table-wrap ia-panel-table-wrap">
              <table className="ia-table">
                <thead className="sticky top-0 z-10 bg-[#F9FAFB] shadow-[0_1px_0_#E6E8EC]">
                  <tr>
                    <th>Title</th>
                    <th>Student</th>
                    <th>Date & Time</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr><td colSpan="5" className="ia-empty">No interviews found.</td></tr>
                  ) : rows.map((x, i) => {
                    const student = (x.participants || []).find(p => p.role === 'STUDENT');
                    return (
                      <tr
                        key={x._id || i}
                        onClick={() => nav(`/interviews/${x._id}`)}
                        className="cursor-pointer hover:bg-[#F8FAFC] transition-colors"
                        title="Click to view interview details"
                      >
                        <td><b>{x.title}</b><small className="font-mono text-[#365FEA]">{x.roomCode}</small></td>
                        <td>{student?.user?.fullName || student?.user?.email || 'Not assigned'}</td>
                        <td>
                          <b>{x.scheduledAt ? new Date(x.scheduledAt).toLocaleDateString() : '—'}</b>
                          <small>{x.scheduledAt ? new Date(x.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</small>
                        </td>
                        <td>
                          <span className={`ia-status ${isInterviewActive(x.status) ? 'live' : isInterviewCompleted(x.status) ? 'done' : 'scheduled'}`}>
                            {isInterviewActive(x.status) ? 'Ongoing' : isInterviewCompleted(x.status) ? 'Completed' : x.status === 'CANCELLED' ? 'Cancelled' : 'Scheduled'}
                          </span>
                        </td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            {normalizeInterviewStatus(x.status) === 'CREATED' && <button className="ia-small-btn" onClick={() => start(x._id)}><PlayCircle size={13} /> Start</button>}
                            {isInterviewActive(x.status) && <button className="ia-small-btn" onClick={() => nav(`/room/${x.roomCode}`)}>Open</button>}
                            {isInterviewActive(x.status) && <button className="ia-small-btn" onClick={() => complete(x._id)}><Square size={12} /> End</button>}
                            {isInterviewCompleted(x.status) && <button className="ia-small-btn" onClick={() => nav(`/reports/${x._id}`)}>Report</button>}
                            <button className="ia-table-icon" onClick={() => nav(`/interviews/${x._id}`)} title="View details">
                              <MoreHorizontal size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="ia-session-list ia-panel-scrollable px-5 py-2">
              {rows.length === 0 ? (
                <div className="ia-empty"><Calendar size={28} /><b>No interview sessions yet</b></div>
              ) : rows.map((x, i) => {
                const r = reports[x._id];
                return (
                  <div className="ia-session" key={x._id || i}>
                    <span className="ia-session-icon"><Code2 size={18} /></span>
                    <div>
                      <b>{x.title}</b>
                      <small>{x.roomCode} • {x.durationMinutes} minutes</small>
                    </div>
                    {r && <span className="ia-status done">{r.overallScore}/100</span>}
                    <span className={`ia-status ${isInterviewCompleted(x.status) ? 'done' : isInterviewActive(x.status) ? 'live' : 'scheduled'}`}>
                      {x.status}
                    </span>
                    {isInterviewCompleted(x.status) && r ? (
                      <button className="ia-small-btn" onClick={() => nav('/reports/' + x._id)}>Report</button>
                    ) : !isInterviewCompleted(x.status) ? (
                      <button className="ia-small-btn" onClick={() => nav('/waiting/' + x.roomCode)}>Open</button>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>
    </div>
  );
}
