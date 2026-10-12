import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Video,
  Search,
  MoreHorizontal,
  PlayCircle,
  RefreshCw,
  Sparkles,
  Square,
  FileText,
  Calendar,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import interviewApi from '../api/interviewApi';
import {
  isInterviewActive,
  isInterviewCompleted,
  normalizeInterviewStatus,
} from '../utils/interviewStatus';
import CreateInterviewModal from '../components/interview/CreateInterviewModal';
import AIQuestionGeneratorModal from '../components/interview/AIQuestionGeneratorModal';

export default function InterviewerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [interviews, setInterviews] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [createdRoom, setCreatedRoom] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [quickRoomCode, setQuickRoomCode] = useState('');

  const loadDashboard = async () => {
    setLoading(true);
    setError('');
    try {
      const [interviewsRes, summaryRes] = await Promise.all([
        interviewApi.getInterviews(),
        interviewApi.getDashboardSummary(),
      ]);
      setInterviews(interviewsRes.data?.interviews || []);
      setSummary(summaryRes.data?.summary || null);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const handleCreateInterview = async (payload) => {
    try {
      const res = await interviewApi.createInterview(payload);
      setCreatedRoom(res.data?.interview);
      await loadDashboard();
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to create interview.');
    }
  };

  const handleStartInterview = async (id, e) => {
    e?.stopPropagation();
    try {
      await interviewApi.startInterview(id);
      await loadDashboard();
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to start interview.');
    }
  };

  const handleCompleteInterview = async (id, e) => {
    e?.stopPropagation();
    try {
      await interviewApi.completeInterview(id);
      await loadDashboard();
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to complete interview.');
    }
  };

  const handleQuickJoin = (e) => {
    e.preventDefault();
    if (quickRoomCode.trim()) {
      navigate(`/room/${quickRoomCode.trim().toUpperCase()}`);
    }
  };

  const filteredInterviews = interviews.filter((item) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      (item.title || '').toLowerCase().includes(q) ||
      (item.roomCode || '').toLowerCase().includes(q);

    if (!matchesSearch) return false;

    const status = normalizeInterviewStatus(item.status);
    if (statusFilter === 'ACTIVE') return isInterviewActive(status);
    if (statusFilter === 'SCHEDULED') return status === 'CREATED';
    if (statusFilter === 'COMPLETED') return isInterviewCompleted(status);
    return true;
  });

  const activeCount = summary?.ongoingInterviews ?? interviews.filter((x) => isInterviewActive(x.status)).length;
  const completedCount = summary?.completedInterviews ?? interviews.filter((x) => isInterviewCompleted(x.status)).length;
  const totalCount = summary?.totalInterviews ?? interviews.length;

  return (
    <div className="ia-page space-y-6">
      {/* High-Contrast Page Header with Strong Typography */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <h1 className="text-3xl font-extrabold text-[#172033] tracking-tight">
            Dashboard
          </h1>
          <p className="text-sm text-[#596579] mt-1">
            Manage your live sessions, scheduled candidates, and evaluation pipelines.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            className="h-10 px-4 rounded-lg bg-white border border-[#DFE5EF] hover:bg-[#F8FAFC] text-xs font-semibold text-[#172033] flex items-center gap-2 shadow-sm transition-all"
            onClick={() => setIsAiOpen(true)}
          >
            <Sparkles size={14} className="text-[#365FEA]" />
            <span>Generate Questions</span>
          </button>

          <button
            type="button"
            className="h-10 px-5 rounded-lg bg-[#365FEA] hover:bg-[#2B4DC7] text-xs font-semibold text-white flex items-center gap-2 shadow-sm transition-all"
            onClick={() => {
              setCreatedRoom(null);
              setIsCreateOpen(true);
            }}
          >
            <Plus size={16} />
            <span>Create Interview</span>
          </button>
        </div>
      </div>

      {error && <div className="ia-error">{error}</div>}

      {/* Confident Summary Metric Strip (Inspired by bold typography & clean hierarchy) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 bg-white border border-[#DFE5EF] rounded-xl shadow-sm divide-y sm:divide-y-0 sm:divide-x divide-[#DFE5EF] overflow-hidden">
        <div className="p-5 flex flex-col justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#596579]">
            Total Sessions
          </span>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-[#172033]">{totalCount}</span>
            <span className="text-xs text-[#596579]">registered interviews</span>
          </div>
        </div>

        <div className="p-5 flex flex-col justify-between bg-[#FBFDFB]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#596579]">
              Live & Ongoing
            </span>
            {activeCount > 0 && (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#DCFCE7] text-[#15803D]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] animate-pulse" />
                Active
              </span>
            )}
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-[#16A34A]">{activeCount}</span>
            <span className="text-xs text-[#596579]">rooms ready for entry</span>
          </div>
        </div>

        <div className="p-5 flex flex-col justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#596579]">
            Completed Sessions
          </span>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-[#365FEA]">{completedCount}</span>
            <span className="text-xs text-[#596579]">scorecards ready</span>
          </div>
        </div>
      </div>

      {/* Main Work Area: Full-Width Clean Sessions Workspace */}
      <div className="bg-white border border-[#DFE5EF] rounded-xl shadow-sm overflow-hidden">
        {/* Card Filter & Search Bar */}
        <div className="p-5 border-b border-[#DFE5EF] flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white">
          <div>
            <h2 className="text-lg font-bold text-[#172033]">
              Interview Sessions
            </h2>
            <p className="text-xs text-[#596579] mt-0.5">
              Click any session to view configuration, candidate details, or reports.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Direct Room Code Gateway */}
            <form onSubmit={handleQuickJoin} className="flex items-center gap-1.5">
              <div className="relative">
                <Video size={13} className="absolute left-2.5 top-2.5 text-[#596579]" />
                <input
                  type="text"
                  placeholder="Code (INT-XXXX)"
                  value={quickRoomCode}
                  onChange={(e) => setQuickRoomCode(e.target.value.toUpperCase())}
                  className="h-9 pl-8 pr-2.5 rounded-lg bg-[#F5F7FB] border border-[#DFE5EF] font-mono font-bold text-xs uppercase text-[#172033] w-36 sm:w-40 focus:bg-white focus:border-[#365FEA] focus:outline-none transition-all"
                />
              </div>
              <button
                type="submit"
                disabled={!quickRoomCode.trim()}
                className="h-9 px-3 rounded-lg bg-[#172033] hover:bg-black text-white text-xs font-semibold disabled:opacity-40 transition-all flex items-center gap-1"
                title="Direct join with room code"
              >
                <span>Join</span>
                <ArrowRight size={13} />
              </button>
            </form>

            <div className="relative">
              <Search size={14} className="absolute left-3 top-2.5 text-[#596579]" />
              <input
                type="text"
                placeholder="Search title or code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 pl-9 pr-3 text-xs bg-[#F5F7FB] border border-[#DFE5EF] rounded-lg text-[#172033] placeholder-[#8592A6] focus:bg-white focus:border-[#365FEA] focus:outline-none w-44 sm:w-52 transition-all"
              />
            </div>

            <button
              onClick={loadDashboard}
              title="Refresh sessions"
              className="w-9 h-9 rounded-lg border border-[#DFE5EF] bg-white hover:bg-[#F5F7FB] text-[#596579] hover:text-[#172033] flex items-center justify-center transition-colors"
            >
              <RefreshCw size={14} />
            </button>
          </div>
        </div>

          {/* Filter Tabs */}
          <div className="px-5 py-2.5 bg-[#F5F7FB] border-b border-[#DFE5EF] flex items-center gap-1.5 overflow-x-auto">
            {[
              { id: 'ALL', label: 'All Sessions' },
              { id: 'ACTIVE', label: 'Active Live' },
              { id: 'SCHEDULED', label: 'Scheduled' },
              { id: 'COMPLETED', label: 'Completed' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  statusFilter === tab.id
                    ? 'bg-white text-[#172033] shadow-sm border border-[#DFE5EF]'
                    : 'text-[#596579] hover:text-[#172033]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Sessions Table */}
          <div className="overflow-x-auto max-h-[520px] overflow-y-auto relative border-t border-[#DFE5EF]">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 z-10 bg-white shadow-[0_1px_0_#DFE5EF]">
                <tr className="border-b border-[#DFE5EF] bg-[#FBFDFD] text-[#596579] uppercase text-[11px] font-bold tracking-wider">
                  <th className="py-3 px-5">Session Details</th>
                  <th className="py-3 px-4">Candidate</th>
                  <th className="py-3 px-4">Schedule</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EEF2F8]">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="py-12 text-center text-[#596579]">
                      Loading interview sessions…
                    </td>
                  </tr>
                ) : filteredInterviews.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-16 text-center">
                      <div className="w-12 h-12 rounded-full bg-[#EEF2F8] text-[#596579] flex items-center justify-center mx-auto mb-3">
                        <Calendar size={20} />
                      </div>
                      <b className="text-sm text-[#172033] block">No interview sessions found</b>
                      <span className="text-xs text-[#596579] mt-1 block">
                        {searchQuery
                          ? 'No interviews match your search criteria.'
                          : 'Create your first technical interview to begin testing.'}
                      </span>
                      {!searchQuery && (
                        <button
                          onClick={() => setIsCreateOpen(true)}
                          className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#365FEA] text-white text-xs font-semibold hover:bg-[#2B4DC7] transition-all"
                        >
                          <Plus size={14} /> Create Interview
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredInterviews.map((item, idx) => {
                    const student = (item.participants || []).find((p) => p.role === 'STUDENT');
                    const status = normalizeInterviewStatus(item.status);
                    const isLive = isInterviewActive(status);
                    const isDone = isInterviewCompleted(status);

                    return (
                      <tr
                        key={item._id || idx}
                        onClick={() => navigate(`/interviews/${item._id}`)}
                        className="hover:bg-[#F8FAFC] cursor-pointer transition-colors group"
                      >
                        <td className="py-3.5 px-5">
                          <div className="font-semibold text-sm text-[#172033] group-hover:text-[#365FEA] transition-colors">
                            {item.title}
                          </div>
                          <div className="mt-1 flex items-center gap-2">
                            <span className="font-mono text-[11px] font-semibold px-1.5 py-0.5 rounded bg-[#EEF2F8] text-[#365FEA]">
                              {item.roomCode}
                            </span>
                            <span className="text-[11px] text-[#596579]">
                              {item.durationMinutes || 60}m
                            </span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-medium text-[#172033]">
                            {student?.user?.fullName || student?.user?.email || 'Unassigned'}
                          </div>
                          <div className="text-[11px] text-[#596579]">
                            {student?.user?.email || 'Pending candidate'}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-medium text-[#172033]">
                            {item.scheduledAt
                              ? new Date(item.scheduledAt).toLocaleDateString()
                              : 'On-demand'}
                          </div>
                          <div className="text-[11px] text-[#596579]">
                            {item.scheduledAt
                              ? new Date(item.scheduledAt).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : 'Flexible schedule'}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                              isLive
                                ? 'bg-[#F0FDF4] text-[#16A34A] border border-[#DCFCE7]'
                                : isDone
                                ? 'bg-[#F0FDF4] text-[#15803D] border border-[#DCFCE7]'
                                : 'bg-[#EFF4FF] text-[#365FEA] border border-[#DBEAFE]'
                            }`}
                          >
                            {isLive && <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] animate-pulse" />}
                            {isLive ? 'Live' : isDone ? 'Completed' : 'Scheduled'}
                          </span>
                        </td>

                        <td className="py-3.5 px-5 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            {status === 'CREATED' && (
                              <button
                                className="px-2.5 py-1.5 rounded-md bg-white border border-[#DFE5EF] hover:bg-[#F5F7FB] text-[#172033] font-semibold text-xs flex items-center gap-1 shadow-sm transition-all"
                                onClick={(e) => handleStartInterview(item._id, e)}
                                title="Start session"
                              >
                                <PlayCircle size={13} className="text-[#365FEA]" />
                                <span>Start</span>
                              </button>
                            )}
                            {isLive && (
                              <>
                                <button
                                  className="px-2.5 py-1.5 rounded-md bg-[#365FEA] text-white hover:bg-[#2B4DC7] font-semibold text-xs flex items-center gap-1 shadow-sm transition-all"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/room/${item.roomCode}`);
                                  }}
                                  title="Enter live room"
                                >
                                  <Video size={13} />
                                  <span>Enter</span>
                                </button>
                                <button
                                  className="px-2 py-1.5 rounded-md border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs transition-all"
                                  onClick={(e) => handleCompleteInterview(item._id, e)}
                                  title="End session"
                                >
                                  <Square size={12} />
                                </button>
                              </>
                            )}
                            {isDone && (
                              <button
                                className="px-2.5 py-1.5 rounded-md bg-white border border-[#DFE5EF] hover:bg-[#F5F7FB] text-[#172033] font-semibold text-xs flex items-center gap-1 shadow-sm transition-all"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/reports/${item._id}`);
                                }}
                                title="View performance report"
                              >
                                <FileText size={13} className="text-[#365FEA]" />
                                <span>Report</span>
                              </button>
                            )}
                            <button
                              className="w-8 h-8 rounded-md hover:bg-[#EEF2F8] text-[#596579] hover:text-[#172033] flex items-center justify-center transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/interviews/${item._id}`);
                              }}
                              title="Session details"
                            >
                              <MoreHorizontal size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      {/* Creation and AI Generator Modals */}
      <CreateInterviewModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreateInterview}
        createdRoom={createdRoom}
      />

      <AIQuestionGeneratorModal
        isOpen={isAiOpen}
        onClose={() => setIsAiOpen(false)}
        interviews={interviews}
      />
    </div>
  );
}
