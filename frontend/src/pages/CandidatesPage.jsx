import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Eye, Users, X, Mail, Video, ArrowRight, CheckCircle2 } from 'lucide-react';
import interviewApi from '../api/interviewApi';

export default function CandidatesPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCandidate, setSelectedCandidate] = useState(null);

  useEffect(() => {
    interviewApi
      .getStudents()
      .then((r) => setRows(r.data?.students || []))
      .catch((e) => setError(e?.response?.data?.message || e.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = rows.filter(
    (r) =>
      (r.fullName || '').toLowerCase().includes(query.toLowerCase()) ||
      (r.email || '').toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="ia-page ia-panel-page">
      <div className="ia-page-head ia-panel-head">
        <div>
          <h1>Candidate Directory</h1>
          <p>Review candidate profiles and assessment track records across your organization.</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/interviews/create')}
          className="h-9 px-4 rounded-lg bg-[#365FEA] hover:bg-[#2B4DC7] text-xs font-semibold text-white flex items-center gap-2 shadow-sm transition-all"
        >
          <Video size={14} />
          <span>Schedule Assessment</span>
        </button>
      </div>

      <div className="ia-card ia-panel-card">
        <div className="ia-card-head ia-panel-card-head">
          <div>
            <h3>
              All Candidates{' '}
              <span className="ia-count">{rows.length}</span>
            </h3>
            <p>Candidate profiles automatically synchronize upon room access.</p>
          </div>
          <div className="ia-search">
            <Search size={16} />
            <input
              placeholder="Search candidate name or email..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>

        {error && <div className="ia-error mb-4 shrink-0">{error}</div>}

        <div className="ia-table-wrap ia-panel-table-wrap">
          <table className="ia-table">
            <thead className="sticky top-0 z-10 bg-[#F9FAFB] shadow-[0_1px_0_#E6E8EC]">
              <tr>
                <th>Candidate</th>
                <th>Email</th>
                <th>Completed Sessions</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" className="ia-empty">
                    Loading candidates…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan="5" className="ia-empty">
                    {query ? 'No matching candidates found.' : 'No candidates registered yet. Candidates appear here after participating in an interview.'}
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr
                    key={r._id}
                    onClick={() => setSelectedCandidate(r)}
                    className="cursor-pointer hover:bg-[#F8FAFC] transition-colors"
                    title="Click to view candidate profile"
                  >
                    <td>
                      <div className="ia-problem-name">
                        <span className="ia-avatar sm">
                          {(r.fullName || 'U')
                            .split(' ')
                            .map((x) => x[0])
                            .join('')
                            .slice(0, 2)
                            .toUpperCase()}
                        </span>
                        <b>{r.fullName || 'Candidate'}</b>
                      </div>
                    </td>
                    <td>{r.email}</td>
                    <td>{r.interviewCount ?? 0}</td>
                    <td>
                      <span className={`ia-status ${r.isActive ? 'done' : 'warning'}`}>
                        {r.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        className="ia-table-icon"
                        title="View Candidate Details"
                        onClick={() => setSelectedCandidate(r)}
                      >
                        <Eye size={15} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Candidate Profile Details Modal */}
      {selectedCandidate && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setSelectedCandidate(null)}
        >
          <div
            className="bg-white rounded-2xl border border-[#DFE5EF] shadow-2xl w-full max-w-md max-h-[calc(100vh-2rem)] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-6 border-b border-[#EEF2F8] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-[#EFF4FF] border border-[#DBEAFE] text-[#365FEA] font-bold text-base flex items-center justify-center shrink-0">
                  {(selectedCandidate.fullName || 'U')
                    .split(' ')
                    .map((x) => x[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#172033]">
                    {selectedCandidate.fullName || 'Candidate'}
                  </h3>
                  <p className="text-xs text-[#596579] flex items-center gap-1 mt-0.5">
                    <Mail size={12} />
                    <span>{selectedCandidate.email}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedCandidate(null)}
                className="w-8 h-8 rounded-lg hover:bg-[#F5F7FB] text-[#596579] hover:text-[#172033] flex items-center justify-center transition-colors shrink-0"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 text-xs overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#EEF2F8]">
                  <span className="text-[11px] font-semibold uppercase text-[#596579] block">
                    Account Status
                  </span>
                  <div className="mt-1 flex items-center gap-1.5 font-bold text-sm text-[#172033]">
                    <span className={`w-2 h-2 rounded-full ${selectedCandidate.isActive ? 'bg-[#16A34A]' : 'bg-[#F59E0B]'}`} />
                    <span>{selectedCandidate.isActive ? 'Active' : 'Inactive'}</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#EEF2F8]">
                  <span className="text-[11px] font-semibold uppercase text-[#596579] block">
                    Completed Sessions
                  </span>
                  <div className="mt-1 font-bold text-sm text-[#365FEA]">
                    {selectedCandidate.interviewCount ?? 0} interviews
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#EEF2F8] space-y-1">
                <span className="text-[11px] font-semibold uppercase text-[#596579] block">
                  Platform Role
                </span>
                <span className="font-semibold text-xs text-[#172033] block">
                  Candidate (Technical Interviewee)
                </span>
                <span className="text-[11px] text-[#596579] block">
                  Evaluated across DSA, System Design, and integrity telemetry.
                </span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-[#F8FAFC] border-t border-[#EEF2F8] flex items-center justify-end gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setSelectedCandidate(null)}
                className="h-9 px-3.5 rounded-lg border border-[#DFE5EF] bg-white hover:bg-[#F5F7FB] text-[#172033] font-semibold text-xs transition-colors"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  const q = selectedCandidate.fullName || selectedCandidate.email;
                  setSelectedCandidate(null);
                  navigate(`/interviews?search=${encodeURIComponent(q)}`);
                }}
                className="h-9 px-4 rounded-lg bg-[#365FEA] hover:bg-[#2B4DC7] text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm transition-all"
              >
                <span>View Sessions</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
