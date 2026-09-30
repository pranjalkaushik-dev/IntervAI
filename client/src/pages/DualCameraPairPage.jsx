import React, { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { Camera, Smartphone } from 'lucide-react';

/**
 * DualCameraPairPage – secondary camera page for a student.
 * Connects to the server via a JWT pairing token and establishes a WebRTC
 * peer connection with the primary device (company). The media stream is never
 * persisted – it is sent directly to the peer.
 */
export default function DualCameraPairPage() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');
  const interviewId = params.get('interview');
  const videoRef = useRef(null);
  const socketRef = useRef(null);
  const pcRef = useRef(null);
  const [status, setStatus] = useState('connecting');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token || !interviewId) {
      setError('Invalid pairing link.');
      setStatus('error');
      return;
    }
    const url = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5001';
    const socket = io(url, {
      auth: { pairingToken: token },
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (videoRef.current) videoRef.current.srcObject = stream;

        pcRef.current = new RTCPeerConnection({
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
        });
        // Add tracks from local stream
        stream.getTracks().forEach((track) => pcRef.current.addTrack(track, stream));

        pcRef.current.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit('dual-camera:ice-candidate', {
              interviewId,
              candidate: event.candidate,
            });
          }
        };

        // Listen for signaling messages from the primary device
        socket.on('dual-camera:offer', async ({ sdp, senderSocketId }) => {
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp));
          const answer = await pcRef.current.createAnswer();
          await pcRef.current.setLocalDescription(answer);
          socket.emit('dual-camera:answer', {
            interviewId,
            sdp: pcRef.current.localDescription,
            targetSocketId: senderSocketId,
          });
          setStatus('connected');
        });

        socket.on('dual-camera:answer', async ({ sdp }) => {
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp));
          setStatus('connected');
        });

        socket.on('dual-camera:ice-candidate', async ({ candidate }) => {
          try {
            await pcRef.current.addIceCandidate(candidate);
          } catch (e) {
            console.error('Error adding ICE candidate', e);
          }
        });

        // Notify server we are ready
        socket.emit('dual-camera:join', { interviewId });
        setStatus('ready');
      } catch (e) {
        setError(e.message || 'Camera permission failed.');
        setStatus('error');
      }
    };

    socket.on('connect', start);
    socket.on('connect_error', (err) => {
      setError(err.message);
      setStatus('error');
    });

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
      if (pcRef.current) pcRef.current.close();
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach((t) => t.stop());
      }
    };
  }, [token, interviewId]);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <div className="flex items-center gap-2">
          <Smartphone className="text-cyan-400" />
          <div>
            <h1 className="font-bold">IntervAI Secondary Camera</h1>
            <p className="text-xs text-slate-400">Keep this phone pointed at your desk/workspace.</p>
          </div>
        </div>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="mt-5 w-full aspect-video rounded-xl bg-black object-cover"
        />
        <div className="mt-4 text-sm">
          <Camera className="inline mr-2" size={15} />
          {status === 'connected'
            ? 'Streaming to company'
            : status === 'ready'
            ? 'Camera ready — waiting for company'
            : status === 'connecting'
            ? 'Starting camera…'
            : 'Error'}
        </div>
        {error && <p className="mt-3 text-sm text-rose-400">{error}</p>}
        <p className="mt-4 text-[11px] text-slate-500">
          Keep this page open for the duration of the interview. Video is sent peer-to-peer and is not stored by IntervAI.
        </p>
      </div>
    </div>
  );
}
