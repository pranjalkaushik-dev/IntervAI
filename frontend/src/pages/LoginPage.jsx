import React, { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Code2, Eye, EyeOff, ArrowRight, CheckCircle2, ShieldCheck, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [registerMode, setRegisterMode] = useState(
    new URLSearchParams(location.search).get('tab') === 'register'
  );
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');

    try {
      if (registerMode) {
        await register(form.name, form.email, form.password, 'STUDENT');
      } else {
        await login(form.email, form.password);
      }
      navigate('/dashboard');
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Unable to sign in. Please verify your credentials.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="ia-auth">
      {/* Brand & Value Proposition Column */}
      <div className="ia-auth-art">
        <Link to="/" className="ia-brand">
          <span className="ia-brand-mark">
            <Code2 size={18} />
          </span>
          <span>
            Interv<span>AI</span>
          </span>
        </Link>

        <div className="ia-auth-copy">
          <span>Technical Assessment Platform</span>
          <h1>
            Evaluated by intelligence,<br />
            <em>built for engineers.</em>
          </h1>
          <p>
            Real-time collaborative code editor, AI-assisted candidate evaluation, and automated proctoring in a single unified workspace.
          </p>

          <div className="ia-auth-points">
            <div>
              <CheckCircle2 /> Real-time code execution with Judge0
            </div>
            <div>
              <CheckCircle2 /> Objective evaluation via Gemini AI
            </div>
            <div>
              <CheckCircle2 /> High-integrity proctoring & session monitoring
            </div>
          </div>
        </div>

        <small className="ia-auth-quote">
          “Preparation and integrity create opportunities.”
        </small>
      </div>

      {/* Authentication Form Column */}
      <div className="ia-auth-panel">
        <div className="ia-auth-card">
          <div className="ia-auth-logo">
            <span className="ia-brand-mark">
              <Code2 size={17} />
            </span>
            <b>
              Interv<span>AI</span>
            </b>
          </div>

          <h2>{registerMode ? 'Create an account' : 'Welcome back'}</h2>
          <p>
            {registerMode
              ? 'Join as a student to participate in assessments and prepare.'
              : 'Enter your credentials to access your interview workspace.'}
          </p>

          {registerMode && (
            <div className="ia-role-note">
              <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-blue-600" />
              <span>Public sign-up registers a Student account. Company accounts are provisioned by your organization administrator.</span>
            </div>
          )}

          {error && <div className="ia-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            {registerMode && (
              <label>
                Full name
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Alex Morgan"
                  required
                />
              </label>
            )}

            <label>
              Work or personal email
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="name@example.com"
                required
              />
            </label>

            <label>
              Password
              <div className="ia-password">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="••••••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>

            {!registerMode && (
              <div className="ia-form-row">
                <label className="ia-check">
                  <input type="checkbox" /> Remember me
                </label>
                <a href="#forgot" onClick={(e) => e.preventDefault()} className="text-blue-600 hover:underline">
                  Forgot password?
                </a>
              </div>
            )}

            <button className="ia-primary-btn wide" disabled={busy} type="submit">
              {busy ? 'Verifying…' : registerMode ? 'Create Student Account' : 'Sign In'}
              <ArrowRight size={15} />
            </button>
          </form>

          <div className="ia-auth-switch">
            {registerMode ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              type="button"
              onClick={() => {
                setError('');
                setRegisterMode(!registerMode);
              }}
            >
              {registerMode ? 'Sign in' : 'Create one'}
            </button>
          </div>
        </div>

        <div className="ia-auth-foot">
          Protected sessions • End-to-end telemetry • Role-based access
        </div>
      </div>
    </div>
  );
}
