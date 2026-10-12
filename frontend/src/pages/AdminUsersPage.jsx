import React, { useEffect, useState } from 'react';
import { UserCog, Power } from 'lucide-react';
import adminApi from '../api/adminApi';

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminApi.users();
      setUsers(res.data?.users || []);
    } catch (e) {
      setError(e.message || 'Unable to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load() }, []);

  const toggle = async u => {
    try {
      await adminApi.updateUser(u._id, { isActive: !u.isActive });
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  const updateRole = async (u, value) => {
    try {
      await adminApi.updateUser(u._id, { role: value });
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div className="ia-page">
      <div className="ia-page-head">
        <div>
          <h1>User Management</h1>
          <p>Manage all registered platform accounts.</p>
        </div>
      </div>
      {error && <div className="ia-error">{error}</div>}
      
      <div className="ia-card">
        <div className="ia-card-head">
          <div>
            <h3>All Users</h3>
          </div>
          <UserCog size={18} />
        </div>
        <div className="ia-table-wrap">
          <table className="ia-table">
            <thead>
              <tr><th>User</th><th>Role</th><th>Status</th><th>Joined</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan="5" className="ia-empty">Loading users...</td></tr> : 
                users.map(u => (
                  <tr key={u._id}>
                    <td><b>{u.fullName}</b><small>{u.email}</small></td>
                    <td>
                      <select className="ia-select" value={u.accountRole} onChange={e => updateRole(u, e.target.value)}>
                        <option value="STUDENT">Student</option>
                        <option value="COMPANY">Company</option>
                        <option value="ADMIN">Admin</option>
                      </select>
                    </td>
                    <td><span className={`ia-status ${u.isActive ? 'done' : 'warning'}`}>{u.isActive ? 'Active' : 'Disabled'}</span></td>
                    <td>{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}</td>
                    <td>
                      <button className="ia-small-btn" onClick={() => toggle(u)}>
                        <Power size={13} /> {u.isActive ? 'Disable' : 'Enable'}
                      </button>
                    </td>
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
