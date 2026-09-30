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

          if (!socket) {
            console.warn(
              '[CV Proctoring] Socket unavailable; violation not sent:',
              violation,
            );
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
      controller.stop();
      controllerRef.current = null;
    };
  }, [interviewId, isStudent, socket]);

  if (!isStudent) {
    return null;
  }

  return (
    <div className="p-3 rounded-lg bg-arena-panel border border-arena-border space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-white">
          AI Proctoring
        </span>

        <span
          className={`text-[10px] font-medium ${
            status === 'active'
              ? 'text-emerald-400'
              : status === 'error'
                ? 'text-rose-400'
                : 'text-amber-400'
          }`}
        >
          {status === 'active'
            ? 'Active'
            : status === 'error'
              ? 'Error'
              : 'Starting…'}
        </span>
      </div>

      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="w-full aspect-video rounded-md bg-black object-cover"
      />

      <div className="grid grid-cols-2 gap-2 text-[10px]">
        <div className="p-2 rounded bg-arena-surface border border-arena-border">
          <div className="text-arena-dim uppercase">
            Face status
          </div>
          <div className="mt-0.5 text-slate-200">
            {faceStatus}
          </div>
        </div>

        <div className="p-2 rounded bg-arena-surface border border-arena-border">
          <div className="text-arena-dim uppercase">
            Last violation
          </div>
          <div className="mt-0.5 text-slate-200 truncate">
            {lastViolation?.type || 'None'}
          </div>
        </div>
      </div>

      {error && (
        <p className="text-[10px] text-rose-400 leading-relaxed">
          {error}
        </p>
      )}
    </div>
  );
}
