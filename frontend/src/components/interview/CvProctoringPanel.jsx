import React, { useEffect, useRef, useState } from 'react';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import { CvProctoringController } from '../../cv-proctoring/proctoring-controller';

const VIOLATION_SEVERITY = {
  CANDIDATE_ABSENT: 'HIGH',
  MULTIPLE_PEOPLE: 'HIGH',
  PROHIBITED_OBJECT: 'HIGH',
  LOOKING_AWAY: 'MEDIUM',
};

export default function CvProctoringPanel({ interviewId }) {
  const { socket } = useSocket();
  const { isStudent } = useAuth();

  const videoRef = useRef(null);
  const controllerRef = useRef(null);

  const [status, setStatus] = useState('starting');
  const [faceStatus, setFaceStatus] = useState('—');
  const [lastViolation, setLastViolation] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isStudent || !interviewId || !videoRef.current) {
      return undefined;
    }

    let cancelled = false;
    const controller = new CvProctoringController({
      detectionIntervalMs: 500,
      violationPersistenceMs: 2000,
      callbacks: {
        onDetection: (result) => {
          if (cancelled) return;
          setFaceStatus(result.status);
        },

        onViolation: (violation) => {
          if (cancelled) return;

          setLastViolation(violation);

          if (!socket?.connected) {
            setError('A violation was detected locally but could not be sent because the monitoring connection is unavailable.');
            return;
          }

          socket.emit('monitoring:violation', {
            interviewId,
            violationType: violation.type,
            metadata: violation.metadata || {},
            severity:
              VIOLATION_SEVERITY[violation.type] || 'MEDIUM',
          });
        },
      },
    });

    controllerRef.current = controller;
    const onMonitoringError = (payload) => {
      if (!cancelled) {
        setError(payload?.message || 'The monitoring service could not save a detected violation.');
      }
    };
    socket?.on('error-event', onMonitoringError);

    async function start() {
      try {
        setStatus('starting');
        setError('');

        await controller.start(videoRef.current);

        if (!cancelled) {
          setStatus('active');
        }
      } catch (err) {
        console.error('[CV Proctoring] Failed to start:', err);

        if (!cancelled) {
          setStatus('error');
          setError(
            err?.message ||
              'Unable to start camera-based proctoring.',
          );
        }

        controller.stop();
      }
    }

    start();

    return () => {
      cancelled = true;
      socket?.off('error-event', onMonitoringError);
      controller.stop();
      controllerRef.current = null;
    };
  }, [interviewId, isStudent, socket]);

  if (!isStudent) {
    return null;
  }

  return (
    <div className="p-3.5 rounded-xl bg-white border border-arena-border space-y-2.5 shadow-xs">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold text-slate-900">
          AI Proctoring &amp; Vision
        </span>

        <span
          className={`text-[10px] font-semibold ${
            status === 'active'
              ? 'text-emerald-600'
              : status === 'error'
                ? 'text-rose-600'
                : 'text-amber-600'
          }`}
        >
          {status === 'active'
            ? '● Detecting on this device'
            : status === 'error'
              ? 'Error'
              : 'Starting…'}
        </span>
      </div>

      <div className="rounded-lg overflow-hidden border border-[#DFE5EF] bg-[#F8FAFC] relative">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="w-full aspect-video object-cover"
        />
      </div>

      <div className="grid grid-cols-2 gap-2 text-[10px]">
        <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
          <div className="text-slate-500 font-medium uppercase">
            Face status
          </div>
          <div className="mt-0.5 font-semibold text-slate-800">
            {faceStatus}
          </div>
        </div>

        <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
          <div className="text-slate-500 font-medium uppercase">
            Last violation
          </div>
          <div className="mt-0.5 font-semibold text-slate-800 truncate">
            {lastViolation?.type || 'None'}
          </div>
        </div>
      </div>

      {error && (
        <p className="text-[10px] text-rose-600 font-medium bg-rose-50 p-2 rounded border border-rose-200 leading-relaxed">
          {error}
        </p>
      )}
    </div>
  );
}
