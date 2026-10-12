import React, { useEffect, useState } from 'react';
import {
  Users,
  Building2,
  ShieldCheck,
  Video,
  CheckCircle2,
  Activity,
  RefreshCw,
  Plus,
  Power,
  UserCog,
  X,
} from 'lucide-react';
import adminApi from '../api/adminApi';

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    accountRole: 'COMPANY',
  });

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [a, u] = await Promise.all([adminApi.analytics(), adminApi.users()]);
      setData(a.data?.analytics);
      setUsers(u.data?.users || []);
    } catch (e) {
      setError(e?.response?.data?.message || e.message || 'Unable to load admin data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const create = async (e) => {
    e.preventDefault();
    try {
      await adminApi.createUser(form);
      setShow(false);
      setForm({ fullName: '', email: '', password: '', accountRole: 'COMPANY' });
      load();
    } catch (e) {
      setError(e?.response?.data?.message || e.message);
    }
  };

  const toggle = async (u) => {
    try {
      await adminApi.updateUser(u._id, { isActive: !u.isActive });
      load();
    } catch (e) {
      setError(e?.response?.data?.message || e.message);
    }
  };

  const role = async (u, value) => {
    try {
      await adminApi.updateUser(u._id, { role: value });
      load();
    } catch (e) {
      setError(e?.response?.data?.message || e.message);
    }
  };

  return (
    <div className="ia-page">
      <div className="ia-page-head">
        <div>
          <h1>Platform Administration</h1>
          <p>Global management of candidates, enterprise accounts, sessions, and system telemetry.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="ia-outline-btn flex items-center gap-1.5" onClick={load}>
            <RefreshCw size={14} /> Refresh
          </button>
          <button className="ia-primary-btn flex items-center gap-1.5" onClick={() => setShow(true)}>
            <Plus size={15} /> Create Account
          </button>
        </div>
      </div>

      {error && <div className="ia-error mb-4">{error}</div>}

      <div className="ia-kpis">
        <Kpi n={data?.students ?? '—'} label="Registered Candidates" icon={Users} />
        <Kpi n={data?.companies ?? '—'} label="Company Accounts" icon={Building2} />
        <Kpi n={data?.interviews ?? '—'} label="Total Interviews" icon={Video} />
        <Kpi n={data?.completedInterviews ?? '—'} label="Completed Sessions" icon={CheckCircle2} />
      </div>

      <div className="ia-dashboard-bottom">
        <div className="ia-card">
          <div className="ia-card-head">
            <div>
              <h3>Platform Health</h3>
              <p>Live metrics from database and active connections</p>
            </div>
            <Activity size={18} className="text-slate-400" />
          </div>
          <div className="ia-integrity-grid">
            <div>
              <b>{data?.liveInterviews ?? '—'}</b>
              <span>Active Sessions</span>
            </div>
            <div>
              <b>{data?.questions ?? '—'}</b>
              <span>Questions</span>
            </div>
            <div>
              <b>{data?.violations ?? '—'}</b>
              <span>Recorded Flags</span>
            </div>
          </div>
        </div>

        <div className="ia-card">
          <div className="ia-card-head">
            <div>
              <h3>Role-Based Access</h3>
              <p>Enforced across JWT and API endpoints</p>
            </div>
            <ShieldCheck size={18} className="text-emerald-600" />
          </div>
          <div className="ia-feedback" style={{ paddingTop: 14 }}>
            <div className="ia-feedback-grid">
              <span>
                <b>Candidate</b>Interview participation, coding rooms, and report access
              </span>
              <span>
                <b>Company</b>Interview authoring, question generation, and analytics
              </span>
              <span>
                <b>Admin</b>Global user provisioning and platform oversight
              </span>
              <span>
                <b>Integrity</b>Secure proctoring telemetry protection
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="ia-card">
        <div className="ia-card-head">
          <div>
            <h3>User Directory</h3>
            <p>{users.length} registered accounts across the platform</p>
          </div>
          <UserCog size={18} className="text-slate-400" />
        </div>
        <div className="ia-table-wrap">
          <table className="ia-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" className="ia-empty">
                    Loading users…
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="5" className="ia-empty">
                    No users found.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u._id}>
                    <td>
                      <b>{u.fullName}</b>
                      <small>{u.email}</small>
                    </td>
                    <td>
                      <select
                        className="ia-select"
                        value={u.accountRole}
                        onChange={(e) => role(u, e.target.value)}
                      >
                        <option value="STUDENT">Student</option>
                        <option value="COMPANY">Company</option>
                        <option value="ADMIN">Admin</option>
                      </select>
                    </td>
                    <td>
                      <span className={`ia-status ${u.isActive ? 'done' : 'warning'}`}>
                        {u.isActive ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td>{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}</td>
                    <td>
                      <button
                        className="ia-small-btn flex items-center gap-1"
                        onClick={() => toggle(u)}
                      >
                        <Power size={12} /> {u.isActive ? 'Disable' : 'Enable'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {show && (
        <div className="ia-modal-backdrop">
          <div className="ia-modal">
            <div className="ia-modal-head">
              <div>
                <h3>Create Managed Account</h3>
                <p>Provision Student, Company, or Admin credentials.</p>
              </div>
              <button onClick={() => setShow(false)}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={create}>
              <label>
                Full Name
                <input
                  required
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                />
              </label>
              <label>
                Email Address
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </label>
              <label>
                Temporary Password
                <input
                  type="password"
                  required
                  minLength="8"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
              </label>
              <label>
                Account Role
                <select
                  value={form.accountRole}
                  onChange={(e) => setForm({ ...form, accountRole: e.target.value })}
                >
                  <option value="STUDENT">Student (Candidate)</option>
                  <option value="COMPANY">Company (Interviewer)</option>
                  <option value="ADMIN">Platform Admin</option>
                </select>
              </label>
              <button className="ia-primary-btn wide justify-center mt-3">
                Create Account
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Kpi({ n, label, icon: Icon }) {
  return (
    <div className="ia-kpi blue">
      <div>
        <span>{label}</span>
        <b>{n}</b>
      </div>
      <i>
        <Icon size={18} />
      </i>
    </div>
  );
}
