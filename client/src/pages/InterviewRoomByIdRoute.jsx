import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import interviewApi from '../api/interviewApi';
import { isInterviewActive } from '../utils/interviewStatus';
import { useAuth } from '../context/AuthContext';

export default function InterviewRoomByIdRoute() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isStudent } = useAuth();
  const [error, setError] = useState('');
  useEffect(() => {
    let alive = true;
    interviewApi.getInterviewById(id).then((response) => {
      if (!alive) return;
      const interview = response.data?.interview;
      if (!interview) throw new Error('Interview not found.');
      if (isStudent && !isInterviewActive(interview.status)) navigate(`/waiting/${interview.roomCode}`, { replace: true });
      else navigate(`/room/${interview.roomCode}`, { replace: true });
    }).catch((e) => alive && setError(e.message || 'Unable to open interview room.'));
    return () => { alive = false; };
  }, [id, isStudent, navigate]);
  return <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">{error ? <div className="text-rose-400">{error}</div> : <div>Opening interview room…</div>}</div>;
}
