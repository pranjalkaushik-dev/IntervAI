import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Video,
  CheckCircle2,
  Users,
  Calendar,
  Code2,
  Upload,
  FileText,
  AlertCircle,
  Clock,
  Sparkles,
} from 'lucide-react';
import interviewApi from '../api/interviewApi';
import reportApi from '../api/reportApi';
import { useAuth } from '../context/AuthContext';
import { isInterviewActive, isInterviewCompleted } from '../utils/interviewStatus';

export default function CandidateDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [roomCode, setRoomCode] = useState('');
  const [interviews, setInterviews] = useState([]);
  const [reports, setReports] = useState({});
  const [error, setError] = useState('');
  const [resumeFile, setResumeFile] = useState(null);
  const [resumeStatus, setResumeStatus] = useState({ message: '', isError: false, loading: false });
  const [selectedInterview, setSelectedInterview] = useState('');

  const loadData = async () => {
    try {
      const res = await interviewApi.getInterviews();
      const list = res.data?.interviews || [];
      setInterviews(list);

      const entries = await Promise.all(
        list
          .filter((x) => isInterviewCompleted(x.status))
          .slice(0, 8)
          .map(async (x) => {
            try {
              const reportRes = await reportApi.getReport(x._id);
              return [x._id, reportRes.data?.report];
            } catch (_) {
              return [x._id, null];
            }
          })
      );
      setReports(Object.fromEntries(entries));
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load interviews.');
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleJoin = async (e) => {
    e.preventDefault();
    const cleanCode = roomCode.trim().toUpperCase();
    if (!cleanCode) {
      setError('Please enter a room code.');
      return;
    }

    try {
      const preview = await interviewApi.previewInterview(cleanCode);
      if (!isInterviewActive(preview.data?.interview?.status)) {
        navigate('/waiting/' + cleanCode);
        return;
      }
      const joinRes = await interviewApi.joinInterview(cleanCode);
      navigate('/room/' + joinRes.data.interview.roomCode);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Invalid room code. Please check and try again.');
    }
  };

  const handleUploadResume = async () => {
    if (!resumeFile) {
      setResumeStatus({ message: 'Please select a resume file first.', isError: true, loading: false });
      return;
    }

    try {
      if (resumeFile.size > 10 * 1024 * 1024) {
        throw new Error('Resume file size must be less than 10 MB.');
      }
      const ext = resumeFile.name.split('.').pop().toLowerCase();
      if (!['pdf', 'docx', 'txt', 'md', 'text'].includes(ext)) {
        throw new Error('Only PDF, DOCX, TXT, and MD formats are supported.');
      }

      setResumeStatus({ message: 'Uploading resume and parsing engineering skills…', isError: false, loading: true });

      let targetInterviewId = selectedInterview;
      let roomCodeToJoin = '';

      if (!targetInterviewId) {
        setResumeStatus({ message: 'Generating personalized AI mock interview…', isError: false, loading: true });
        const newInterviewRes = await interviewApi.createMockInterview();
        targetInterviewId = newInterviewRes.data.interview._id;
        roomCodeToJoin = newInterviewRes.data.interview.roomCode;
      }

      const formData = new FormData();
      formData.append('resume', resumeFile);
      await interviewApi.uploadResumeFile(targetInterviewId, formData);

      if (roomCodeToJoin) {
        setResumeStatus({ message: 'Resume uploaded! Redirecting to live interview…', isError: false, loading: false });
        setTimeout(() => navigate('/room/' + roomCodeToJoin), 1200);
      } else {
        setResumeStatus({ message: `Successfully attached ${resumeFile.name} to interview.`, isError: false, loading: false });
        await loadData();
      }
    } catch (err) {
      setResumeStatus({
        message: err?.response?.data?.message || err?.message || 'Failed to process resume.',
        isError: true,
        loading: false,
      });
    }
  };

  const completedList = Object.values(reports).filter(Boolean);
  const avgPerformance = completedList.length
    ? Math.round(completedList.reduce((acc, r) => acc + (r.overallScore || 0), 0) / completedList.length)
    : null;
  const avgIntegrity = completedList.length
    ? Math.round(completedList.reduce((acc, r) => acc + (r.integrityScore || 0), 0) / completedList.length)
    : null;

  return (
    <div className="ia-page">
      {/* Page Header */}
      <div className="ia-page-head">
        <div>
          <h1>Candidate Dashboard</h1>
          <p>Welcome back, {user?.fullName || 'Candidate'}. Join scheduled assessments, practice live coding, and view evaluation reports.</p>
        </div>
      </div>

      {/* Hero Quick Join Banner */}
      <div className="ia-student-hero">
        <div>
          <span className="ia-eyebrow blue">Candidate Gateway</span>
          <h2>Join your next interview.</h2>
          <p>
            Enter the unique room code provided by your interviewer or institution to enter the waiting room.
          </p>
        </div>

        <form onSubmit={handleJoin} className="ia-join-box">
          <label>Enter Interview Room Code</label>
          <div>
            <input
              value={roomCode}
              onChange={(e) => {
                setRoomCode(e.target.value.toUpperCase());
                if (error) setError('');
              }}
              placeholder="INT-XXXXXX"
              maxLength={12}
            />
            <button className="ia-primary-btn" type="submit">
              <span>Join</span>
              <ArrowRight size={15} />
            </button>
          </div>
          {error && (
            <div className="flex items-center gap-1.5 mt-2 text-xs text-rose-600 font-medium">
              <AlertCircle size={13} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </form>
      </div>

      {/* Metric Cards */}
      <div className="ia-kpis">
        <KpiCard
          count={interviews.length}
          label="Interviews Enrolled"
          icon={Video}
          tone="blue"
        />
        <KpiCard
          count={avgPerformance == null ? '—' : `${avgPerformance}/100`}
          label="Average Performance"
          icon={Code2}
          tone="purple"
        />
        <KpiCard
          count={avgIntegrity == null ? '—' : `${avgIntegrity}/100`}
          label="Average Integrity"
          icon={CheckCircle2}
          tone="green"
        />
        <KpiCard
          count="Ready"
          label="Mock Practice"
          icon={Users}
          tone="cyan"
        />
      </div>

      {/* Resume Profile & AI Preparation Card */}
      <div className="ia-card">
        <div className="ia-card-head">
          <div>
            <h3>Resume Profile & Tailored AI Mock Questions</h3>
            <p>Upload your resume to extract engineering skills and generate questions tailored to your experience</p>
          </div>
          <FileText size={18} className="text-slate-400" />
        </div>

        <div className="p-5 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <select
              className="ia-select min-w-[260px]"
              value={selectedInterview}
              onChange={(e) => setSelectedInterview(e.target.value)}
            >
              <option value="">Start New AI Mock Interview</option>
              {interviews.map((item) => (
                <option key={item._id} value={item._id}>
                  {item.title} • {item.roomCode}
                </option>
              ))}
            </select>

            <label className="ia-outline-btn cursor-pointer inline-flex items-center gap-2">
              <Upload size={14} />
              <span>{resumeFile ? resumeFile.name : 'Choose Resume (PDF, DOCX)'}</span>
              <input
                type="file"
                accept=".pdf,.docx,.txt,.md,.text"
                className="hidden"
                onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
              />
            </label>

            <button
              type="button"
              className="ia-primary-btn"
              disabled={resumeStatus.loading}
              onClick={handleUploadResume}
            >
              <Sparkles size={14} />
              <span>{resumeStatus.loading ? 'Processing…' : 'Generate Interview from Resume'}</span>
            </button>
          </div>

          {resumeStatus.message && (
            <div
              className={`p-3 rounded-lg text-xs font-medium flex items-center gap-2 ${
                resumeStatus.isError
                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                  : 'bg-blue-50 text-blue-700 border border-blue-200'
              }`}
            >
              {resumeStatus.isError ? <AlertCircle size={14} /> : <CheckCircle2 size={14} />}
              <span>{resumeStatus.message}</span>
            </div>
          )}
        </div>
      </div>

      {/* Enrolled Interview Sessions */}
      <div className="ia-card">
        <div className="ia-card-head">
          <div>
            <h3>Your Technical Interview Sessions</h3>
            <p>Assigned assessment rooms, live sessions, and evaluation performance reports</p>
          </div>
        </div>

        {interviews.length === 0 ? (
          <div className="ia-empty">
            <Calendar size={28} className="text-slate-400" />
            <b>No interview sessions yet</b>
            <span>When an organization invites you or when you create a mock round, it will appear here.</span>
          </div>
        ) : (
          <div className="ia-session-list">
            {interviews.map((item, idx) => {
              const report = reports[item._id];
              const isDone = isInterviewCompleted(item.status);
              const isLive = isInterviewActive(item.status);

              return (
                <div className="ia-session" key={item._id || idx}>
                  <span className="ia-session-icon">
                    <Code2 size={17} />
                  </span>

                  <div>
                    <b>{item.title}</b>
                    <small>
                      <span className="font-mono text-blue-600 font-semibold">{item.roomCode}</span> •{' '}
                      {item.durationMinutes || 60} minutes •{' '}
                      {item.scheduledAt
                        ? new Date(item.scheduledAt).toLocaleDateString()
                        : 'On-demand'}
                    </small>
                  </div>

                  {report && (
                    <span className="ia-status done">
                      Score: {report.overallScore}/100
                    </span>
                  )}

                  <span className={`ia-status ${isDone ? 'done' : isLive ? 'live' : 'scheduled'}`}>
                    {isLive ? '● Live Now' : isDone ? 'Completed' : 'Scheduled'}
                  </span>

                  {isDone && report ? (
                    <button
                      className="ia-small-btn"
                      onClick={() => navigate(`/reports/${item._id}`)}
                    >
                      <FileText size={12} />
                      <span>Report</span>
                    </button>
                  ) : (
                    <button
                      className="ia-small-btn"
                      onClick={() => navigate(`/waiting/${item.roomCode}`)}
                    >
                      <span>Enter Waiting Room</span>
                      <ArrowRight size={12} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function KpiCard({ count, label, icon: Icon, tone }) {
  return (
    <div className={`ia-kpi ${tone}`}>
      <div>
        <span>{label}</span>
        <b>{count}</b>
      </div>
      <i>
        <Icon size={19} />
      </i>
    </div>
  );
}
