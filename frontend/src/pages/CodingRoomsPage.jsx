import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Code2, Users, Plus, ArrowRight, Terminal } from 'lucide-react';
import interviewApi from '../api/interviewApi';
import { isInterviewActive } from '../utils/interviewStatus';

export default function CodingRoomsPage() {
  const [roomCode, setRoomCode] = useState('');
  const [newRoomTitle, setNewRoomTitle] = useState('');
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    interviewApi
      .getInterviews()
      .then((r) =>
        setRooms((r.data?.interviews || []).filter((x) => isInterviewActive(x.status)))
      )
      .catch((e) => setError(e?.response?.data?.message || e.message))
      .finally(() => setLoading(false));
  }, []);

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    try {
      setError('');
      setLoading(true);
      const res = await interviewApi.createP2PInterview({
        topic: newRoomTitle.trim() || 'Collaborative Coding Session',
        durationMinutes: 60,
      });
      const code = res.data?.interview?.roomCode;
      if (code) {
        navigate(`/room/${code}`);
      } else {
        setError('Failed to initialize session room.');
      }
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to initialize session room.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = (e) => {
    e.preventDefault();
    if (roomCode.trim()) navigate(`/room/${roomCode.trim().toUpperCase()}`);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-2">
      <div className="pb-3 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-display">
            Shared Coding & Collaboration Rooms
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time collaborative code scratchpads and synchronized interview workspaces.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="ia-card p-6 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center">
              <Plus className="w-4 h-4" />
            </div>
            <span>Create New Collaboration Room</span>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Persistent rooms are associated with interview sessions so participants, questions, and telemetry are safely recorded.
          </p>
          <form onSubmit={handleCreateRoom} className="space-y-3 pt-1">
            <input
              className="w-full h-10 border border-slate-200 rounded-lg px-3 text-sm bg-slate-50 focus:bg-white focus:border-blue-500 focus:outline-none"
              placeholder="Session topic or description"
              value={newRoomTitle}
              onChange={(e) => setNewRoomTitle(e.target.value)}
            />
            <button className="ia-primary-btn w-full justify-center" type="submit">
              <Code2 size={15} /> Open Interview Session
            </button>
          </form>
        </div>

        <div className="ia-card p-6 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center">
              <Terminal className="w-4 h-4" />
            </div>
            <span>Join Existing Room</span>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Enter an active 6-character room code shared by your company interviewer or peer.
          </p>
          <form onSubmit={handleJoin} className="space-y-3 pt-1">
            <input
              className="w-full h-10 border border-slate-200 rounded-lg px-3 font-mono font-bold uppercase tracking-wider text-sm bg-slate-50 focus:bg-white focus:border-blue-500 focus:outline-none"
              placeholder="INT-XXXX"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              required
            />
            <button
              className="ia-primary-btn w-full justify-center"
              type="submit"
              disabled={!roomCode.trim()}
            >
              Enter Room <ArrowRight size={15} />
            </button>
          </form>
        </div>
      </div>

      <div className="ia-card">
        <div className="ia-card-head">
          <div>
            <h3>Active Assessment Sessions</h3>
            <p>Live interviews currently in progress</p>
          </div>
        </div>

        {error && <div className="ia-error mb-4">{error}</div>}

        {loading ? (
          <div className="ia-empty py-10">Loading active rooms…</div>
        ) : rooms.length === 0 ? (
          <div className="ia-empty py-12 flex flex-col items-center justify-center text-center">
            <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mb-2">
              <Users size={20} />
            </div>
            <b className="text-slate-800">No active rooms at the moment</b>
            <span className="text-xs text-slate-500 mt-1">
              Active sessions appear here when interviewers launch them.
            </span>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {rooms.map((room) => (
              <div
                key={room._id}
                className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                      {room.roomCode}
                    </span>
                    <span className="text-sm font-semibold text-slate-900">{room.title}</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {(room.participants || []).length} participant(s) enrolled
                  </div>
                </div>
                <button
                  className="ia-outline-btn flex items-center gap-1.5"
                  onClick={() => navigate(`/room/${room.roomCode}`)}
                >
                  <span>Join Session</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
