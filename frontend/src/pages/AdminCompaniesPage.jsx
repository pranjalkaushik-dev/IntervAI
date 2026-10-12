import React, { useEffect, useState } from 'react';
import { Building2 } from 'lucide-react';
import adminApi from '../api/adminApi';

export default function AdminCompaniesPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    adminApi.users().then(res => {
      setUsers((res.data?.users || []).filter(u => u.accountRole === 'COMPANY'));
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
          <h1>Companies</h1>
          <p>Manage platform companies.</p>
        </div>
      </div>
      {error && <div className="ia-error">{error}</div>}
      
      <div className="ia-card">
        <div className="ia-card-head">
          <div><h3>Company Accounts</h3></div>
          <Building2 size={18} />
        </div>
        <div className="ia-table-wrap">
          <table className="ia-table">
            <thead>
              <tr><th>Company Name</th><th>Email</th><th>Joined</th><th>Status</th></tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan="4" className="ia-empty">Loading companies...</td></tr> : 
                users.length === 0 ? <tr><td colSpan="4" className="ia-empty">No companies found.</td></tr> :
                users.map(u => (
                  <tr key={u._id}>
                    <td><b>{u.fullName}</b></td>
                    <td>{u.email}</td>
                    <td>{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}</td>
                    <td><span className={`ia-status ${u.isActive ? 'done' : 'warning'}`}>{u.isActive ? 'Active' : 'Disabled'}</span></td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
