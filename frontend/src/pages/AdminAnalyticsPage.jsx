import React, { useEffect, useState } from 'react';
import { BarChart3, Activity } from 'lucide-react';
import adminApi from '../api/adminApi';

export default function AdminAnalyticsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    adminApi.analytics().then(res => {
      setData(res.data?.analytics);
      setLoading(false);
    }).catch(e => {
      setError(e.message);
      setLoading(false);
    });
  }, []);

  return (
    <div className="ia-page">
      <div className="ia-page-head">
        <div>
          <h1>Platform Analytics</h1>
          <p>Global platform metrics and integrity data.</p>
        </div>
      </div>
      {error && <div className="ia-error">{error}</div>}
      
      <div className="ia-dashboard-bottom">
        <div className="ia-card">
          <div className="ia-card-head">
            <div>
              <h3>Platform Health</h3>
            </div>
            <Activity size={18} />
          </div>
          {loading ? <div className="ia-empty">Loading metrics...</div> : (
            <div className="ia-integrity-grid">
              <div><b>{data?.liveInterviews ?? '—'}</b><span>Live sessions</span></div>
              <div><b>{data?.questions ?? '—'}</b><span>Questions</span></div>
              <div><b>{data?.violations ?? '—'}</b><span>Violations</span></div>
              <div><b>{data?.interviews ?? '—'}</b><span>Total Interviews</span></div>
              <div><b>{data?.completedInterviews ?? '—'}</b><span>Completed</span></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
