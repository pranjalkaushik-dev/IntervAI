import React, { useEffect, useState } from 'react';
import { FileText } from 'lucide-react';
import AppShell from '../components/layout/AppShell';
import adminApi from '../api/adminApi';

export default function AdminReportsPage() {
  const [reports, setReports] = useState([]); const [error, setError] = useState('');
  useEffect(() => { adminApi.reports().then((r) => setReports(r.data?.reports || [])).catch((e) => setError(e.message || 'Unable to load reports.')); }, []);
  return <AppShell><div className="ia-page"><div className="ia-page-head"><div><h1>System Reports</h1><p>Inspect persisted interview reports across the platform.</p></div></div>{error && <div className="ia-error">{error}</div>}<div className="ia-card"><div className="ia-session-list">{reports.length ? reports.map((r) => <div className="ia-session" key={r._id}><FileText size={18}/><div><b>{r.interviewId?.title || 'Interview report'}</b><small>{r.studentId?.fullName || 'Student'} • {r.interviewId?.roomCode || '—'}</small></div><span className="ia-status done">{r.overallScore ?? 0}/100</span></div>) : <div className="ia-empty">No reports found.</div>}</div></div></div></AppShell>;
}
