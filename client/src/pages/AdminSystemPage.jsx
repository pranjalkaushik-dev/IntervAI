import React, { useEffect, useState } from 'react';
import AppShell from '../components/layout/AppShell';
import adminApi from '../api/adminApi';

export default function AdminSystemPage() {
  const [system, setSystem] = useState(null); const [error, setError] = useState('');
  useEffect(() => { adminApi.system().then((r) => setSystem(r.data?.system || null)).catch((e) => setError(e.message || 'Unable to load system status.')); }, []);
  return <AppShell><div className="ia-page"><div className="ia-page-head"><div><h1>System Status</h1><p>Runtime, database and AI service health.</p></div></div>{error && <div className="ia-error">{error}</div>}<div className="ia-card"><div className="ia-session-list">{system ? <><div className="ia-session"><b>Node.js</b><span>{system.nodeVersion}</span></div><div className="ia-session"><b>Environment</b><span>{system.environment}</span></div><div className="ia-session"><b>Database</b><span>{system.database}</span></div><div className="ia-session"><b>AI service</b><span>{system.aiService?.status || 'UNKNOWN'}</span></div><div className="ia-session"><b>Uptime</b><span>{system.uptimeSeconds}s</span></div></> : <div className="ia-empty">Loading system status...</div>}</div></div></div></AppShell>;
}
