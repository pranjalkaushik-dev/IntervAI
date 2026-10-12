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
    const configuredSocketUrl = import.meta.env.VITE_SOCKET_URL?.trim();
    let socketUrl = configuredSocketUrl || window.location.origin;
    try {
      const configured = new URL(socketUrl, window.location.origin);
      const isRemoteDevice = !['localhost', '127.0.0.1'].includes(window.location.hostname);
      if (isRemoteDevice && ['localhost', '127.0.0.1'].includes(configured.hostname)) {
        socketUrl = window.location.origin;
      }
    } catch (_) {}
    const socket = io(socketUrl, {
      path: '/socket.io',
      auth: { pairingToken: token },
      transports: ['polling', 'websocket'],
      upgrade: true,
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
    <div className="min-h-screen bg-[#F5F7FB] text-[#172033] flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-[#DFE5EF] bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-base text-[#172033]">IntervAI Secondary Camera</h1>
            <p className="text-xs text-[#596579]">Keep this phone pointed at your desk / workspace.</p>
          </div>
        </div>
        <div className="mt-5 rounded-xl overflow-hidden border border-[#DFE5EF] bg-black">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full aspect-video object-cover"
          />
        </div>
        <div className="mt-4 text-xs font-medium text-[#172033] flex items-center gap-2">
          <Camera className="w-4 h-4 text-blue-600" />
          <span>
            {status === 'connected'
              ? 'Streaming to interviewer'
              : status === 'ready'
              ? 'Camera ready — waiting for interviewer'
              : status === 'connecting'
              ? 'Starting camera…'
              : 'Error'}
          </span>
        </div>
        {error && <p className="mt-3 text-xs text-rose-600 font-medium">{error}</p>}
        <p className="mt-4 text-[11px] text-[#8592A6] leading-relaxed">
          Keep this page open for the duration of the interview. Video is sent peer-to-peer and is not stored by IntervAI.
        </p>
      </div>
    </div>
  );
}
