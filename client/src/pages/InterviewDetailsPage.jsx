import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, PlayCircle, Video, FileText } from 'lucide-react';
import AppShell from '../components/layout/AppShell';
import interviewApi from '../api/interviewApi';
import { isInterviewActive, isInterviewCompleted, normalizeInterviewStatus } from '../utils/interviewStatus';

export default function InterviewDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [interview, setInterview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = async () => {
    try {
      setLoading(true); setError('');
      const response = await interviewApi.getInterviewById(id);
      setInterview(response.data?.interview || null);
    } catch (e) { setError(e.message || 'Unable to load interview.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [id]);
  if (loading) return <AppShell><div className="ia-empty">Loading interview...</div></AppShell>;
  if (error || !interview) return <AppShell><div className="ia-error">{error || 'Interview not found.'}</div></AppShell>;
  const status = normalizeInterviewStatus(interview.status);
  const student = (interview.participants || []).find((p) => p.role === 'STUDENT');
  return <AppShell>
    <div className="ia-page">
      <button className="ia-outline-btn" onClick={() => navigate('/interviews')}><ArrowLeft size={14}/> Back to interviews</button>
      <div className="ia-page-head" style={{ marginTop: 16 }}><div><h1>{interview.title}</h1><p>{interview.description || 'Technical interview session'}</p></div><span className={`ia-status ${isInterviewCompleted(status) ? 'done' : isInterviewActive(status) ? 'live' : 'scheduled'}`}>{status}</span></div>
      <div className="ia-kpis"><div className="ia-kpi blue"><div><span>Room code</span><b>{interview.roomCode}</b></div><i><Video size={19}/></i></div><div className="ia-kpi purple"><div><span>Duration</span><b>{interview.durationMinutes} min</b></div><i><PlayCircle size={19}/></i></div><div className="ia-kpi green"><div><span>Student</span><b>{student?.user?.fullName || 'Not assigned'}</b></div><i><FileText size={19}/></i></div></div>
      <div className="ia-card"><h3>Interview lifecycle</h3><div className="ia-session-list"><div className="ia-session"><b>Status</b><span>{status}</span></div><div className="ia-session"><b>Created</b><span>{interview.createdAt ? new Date(interview.createdAt).toLocaleString() : '—'}</span></div><div className="ia-session"><b>Started</b><span>{interview.startedAt ? new Date(interview.startedAt).toLocaleString() : '—'}</span></div><div className="ia-session"><b>Completed</b><span>{interview.completedAt ? new Date(interview.completedAt).toLocaleString() : '—'}</span></div></div></div>
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        {isInterviewActive(status) && <button className="ia-primary-btn" onClick={() => navigate(`/interviews/${interview._id}/room`)}><Video size={15}/> Open room</button>}
        {isInterviewCompleted(status) && <button className="ia-outline-btn" onClick={() => navigate(`/reports/${interview._id}`)}><FileText size={15}/> View report</button>}
      </div>
    </div>
  </AppShell>;
}
