import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  PlayCircle,
  Video,
  FileText,
  Clock,
  User,
  Shield,
  Copy,
  Check,
  Code2,
  Calendar,
  Square,
} from 'lucide-react';
import AppShell from '../components/layout/AppShell';
import interviewApi from '../api/interviewApi';
import {
  isInterviewActive,
  isInterviewCompleted,
  normalizeInterviewStatus,
} from '../utils/interviewStatus';

export default function InterviewDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [interview, setInterview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await interviewApi.getInterviewById(id);
      setInterview(response.data?.interview || null);
    } catch (e) {
      setError(e?.response?.data?.message || e.message || 'Unable to load interview details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const handleStart = async () => {
    try {
      await interviewApi.startInterview(id);
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || e.message || 'Failed to start interview.');
    }
  };

  const handleComplete = async () => {
    try {
      await interviewApi.completeInterview(id);
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || e.message || 'Failed to end interview.');
    }
  };

  const copyRoomCode = () => {
    if (!interview?.roomCode) return;
    navigator.clipboard?.writeText(interview.roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <AppShell>
        <div className="ia-page">
          <div className="ia-card ia-empty py-16">
            <span>Loading interview details…</span>
          </div>
        </div>
      </AppShell>
    );
  }

  if (error || !interview) {
    return (
      <AppShell>
        <div className="ia-page">
          <button
            className="ia-outline-btn mb-4"
            onClick={() => navigate('/dashboard')}
          >
            <ArrowLeft size={14} /> Back to Dashboard
          </button>
          <div className="ia-error">{error || 'Interview not found.'}</div>
        </div>
      </AppShell>
    );
  }

  const status = normalizeInterviewStatus(interview.status);
  const isLive = isInterviewActive(status);
  const isDone = isInterviewCompleted(status);
  const student = (interview.participants || []).find((p) => p.role === 'STUDENT');

  return (
    <AppShell>
      <div className="ia-page">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between mb-4">
          <button
            className="ia-outline-btn flex items-center gap-1.5"
            onClick={() => navigate('/dashboard')}
          >
            <ArrowLeft size={14} />
            <span>Back to Dashboard</span>
          </button>

          <span
            className={`ia-status ${
              isLive ? 'live' : isDone ? 'done' : 'scheduled'
            }`}
          >
            {isLive
              ? '● Live Session'
              : isDone
              ? 'Completed'
              : status === 'CANCELLED'
              ? 'Cancelled'
              : 'Scheduled'}
          </span>
        </div>

        {/* Page Header with Action Bar */}
        <div className="ia-page-head">
          <div>
            <h1>{interview.title}</h1>
            <p className="mt-1 text-slate-500 text-xs">
              {interview.description || 'Technical interview assessment session'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {status === 'CREATED' && (
              <button
                className="ia-primary-btn flex items-center gap-1.5"
                onClick={handleStart}
              >
                <PlayCircle size={15} />
                <span>Start Session</span>
              </button>
            )}
            {isLive && (
              <>
                <button
                  className="ia-primary-btn flex items-center gap-1.5"
                  onClick={() => navigate(`/room/${interview.roomCode}`)}
                >
                  <Video size={15} />
                  <span>Enter Room</span>
                </button>
                <button
                  className="ia-outline-btn text-rose-600 border-rose-200 hover:bg-rose-50 flex items-center gap-1.5"
                  onClick={handleComplete}
                >
                  <Square size={13} />
                  <span>End Session</span>
                </button>
              </>
            )}
            {isDone && (
              <button
                className="ia-primary-btn flex items-center gap-1.5"
                onClick={() => navigate(`/reports/${interview._id}`)}
              >
                <FileText size={15} />
                <span>View Performance Report</span>
              </button>
            )}
          </div>
        </div>

        {/* Structured Grid: Details on Demand */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Configuration and Candidate (2 cols) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Session Room & Access Card */}
            <div className="ia-card">
              <div className="ia-card-head">
                <div>
                  <h3>Session Access & Gateway</h3>
                  <p>Candidate room code and gateway access details</p>
                </div>
              </div>

              <div className="p-5 grid sm:grid-cols-2 gap-4">
                <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="text-[11px] text-slate-500 font-medium uppercase tracking-wider mb-1">
                    Room Code
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-lg font-bold text-slate-900 tracking-wider">
                      {interview.roomCode}
                    </span>
                    <button
                      onClick={copyRoomCode}
                      className="ia-icon-btn text-xs text-slate-600 hover:text-slate-900"
                      title="Copy room code"
                    >
                      {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>

                <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="text-[11px] text-slate-500 font-medium uppercase tracking-wider mb-1">
                    Duration Limit
                  </div>
                  <div className="flex items-center gap-2 font-semibold text-slate-900 text-lg">
                    <Clock size={16} className="text-slate-400" />
                    <span>{interview.durationMinutes || 60} Minutes</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Candidate Assignment Card */}
            <div className="ia-card">
              <div className="ia-card-head">
                <div>
                  <h3>Assigned Candidate</h3>
                  <p>Participant profile registered for this interview</p>
                </div>
                <User size={16} className="text-slate-400" />
              </div>

              <div className="p-5">
                {student?.user ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-700 font-bold flex items-center justify-center text-sm border border-blue-200">
                        {(student.user.fullName || 'C').slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900">
                          {student.user.fullName || 'Candidate'}
                        </div>
                        <div className="text-xs text-slate-500">{student.user.email}</div>
                      </div>
                    </div>
                    <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                      {student.inviteStatus || 'ASSIGNED'}
                    </span>
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 italic py-2">
                    No specific candidate pre-assigned. The first candidate who enters via room code{' '}
                    <b className="font-mono text-slate-700">{interview.roomCode}</b> will be enrolled.
                  </div>
                )}
              </div>
            </div>

            {/* Questions Card */}
            <div className="ia-card">
              <div className="ia-card-head">
                <div>
                  <h3>Technical Problems ({interview.questions?.length || 0})</h3>
                  <p>Selected questions configured for this assessment</p>
                </div>
                <Code2 size={16} className="text-slate-400" />
              </div>

              <div className="p-5">
                {!interview.questions || interview.questions.length === 0 ? (
                  <div className="text-xs text-slate-500 italic py-2">
                    No static questions attached. General coding scratchpad mode active.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {interview.questions.map((q, idx) => (
                      <div
                        key={q._id || idx}
                        className="py-3 flex items-center justify-between first:pt-0 last:pb-0"
                      >
                        <div>
                          <div className="font-semibold text-slate-900 text-xs">
                            {idx + 1}. {q.title || 'Technical Problem'}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {q.category || 'Algorithms'} &bull; {q.interviewType || 'Coding'}
                          </div>
                        </div>
                        <span
                          className={`ia-diff ${
                            String(q.difficulty).toLowerCase() === 'easy'
                              ? 'easy'
                              : String(q.difficulty).toLowerCase() === 'hard'
                              ? 'hard'
                              : 'medium'
                          }`}
                        >
                          {q.difficulty || 'Medium'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Timeline & Settings (1 col) */}
          <div className="space-y-6">
            {/* Session Lifecycle Card */}
            <div className="ia-card">
              <div className="ia-card-head">
                <div>
                  <h3>Session Lifecycle</h3>
                  <p>Timestamp records</p>
                </div>
                <Calendar size={16} className="text-slate-400" />
              </div>

              <div className="p-5 space-y-3 text-xs">
                <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Current Status</span>
                  <b className="text-slate-800">{status}</b>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Scheduled Date</span>
                  <b className="text-slate-800">
                    {interview.scheduledAt
                      ? new Date(interview.scheduledAt).toLocaleString()
                      : 'On-demand'}
                  </b>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Created At</span>
                  <span className="text-slate-700">
                    {interview.createdAt
                      ? new Date(interview.createdAt).toLocaleString()
                      : '—'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Started At</span>
                  <span className="text-slate-700">
                    {interview.startedAt
                      ? new Date(interview.startedAt).toLocaleString()
                      : 'Not started'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1.5">
                  <span className="text-slate-500">Completed At</span>
                  <span className="text-slate-700">
                    {interview.completedAt
                      ? new Date(interview.completedAt).toLocaleString()
                      : 'Not completed'}
                  </span>
                </div>
              </div>
            </div>

            {/* Integrity Settings */}
            <div className="ia-card">
              <div className="ia-card-head">
                <div>
                  <h3>Integrity Controls</h3>
                  <p>Proctoring parameters</p>
                </div>
                <Shield size={16} className="text-slate-400" />
              </div>

              <div className="p-5 space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Require Fullscreen</span>
                  <span className="font-semibold text-slate-800">
                    {interview.settings?.requireFullscreen ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Dual-Camera Proctoring</span>
                  <span className="font-semibold text-slate-800">
                    {interview.settings?.enableSecondaryCamera ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Tab Switching Telemetry</span>
                  <span className="font-semibold text-slate-800">Enabled</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
