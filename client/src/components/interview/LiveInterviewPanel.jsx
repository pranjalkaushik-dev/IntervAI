import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, MonitorUp, MonitorOff, Mic, MicOff, PhoneCall } from 'lucide-react';
import { useSocket } from '../../context/SocketContext';

const ICE_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }];

export default function LiveInterviewPanel({ roomCode, isCompany }) {
  const { socket } = useSocket();
  const localVideo = useRef(null);
  const remoteCameraVideo = useRef(null);
  const remoteScreenVideo = useRef(null);
  const pcRef = useRef(null);
  const remoteSocketRef = useRef(null);
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const cameraSenderRef = useRef(null);
  const audioSenderRef = useRef(null);
  const screenSenderRef = useRef(null);
  const remoteCameraStreamRef = useRef(new MediaStream());
  const remoteScreenStreamRef = useRef(new MediaStream());
  const remoteMediaMapRef = useRef({ cameraStreamId: null, screenStreamId: null });
  const pendingIceCandidatesRef = useRef([]);
  const makingOfferRef = useRef(false);
  const ignoreOfferRef = useRef(false);
  const polite = isCompany;

  const [camera, setCamera] = useState(false);
  const [mic, setMic] = useState(false);
  const [screen, setScreen] = useState(false);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState('');
  const [remoteScreenVisible, setRemoteScreenVisible] = useState(false);

  const mediaMetadata = useCallback(() => ({
    cameraStreamId: localStreamRef.current?.id || null,
    screenStreamId: screenStreamRef.current?.id || null,
  }), []);

  const attachRemoteStreams = useCallback(() => {
    if (remoteCameraVideo.current) remoteCameraVideo.current.srcObject = remoteCameraStreamRef.current;
    if (remoteScreenVideo.current) remoteScreenVideo.current.srcObject = remoteScreenStreamRef.current;
  }, []);

  const createPeer = useCallback(() => {
    if (pcRef.current) return pcRef.current;
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pcRef.current = pc;

    pc.onicecandidate = (event) => {
      if (event.candidate && remoteSocketRef.current && socket) {
        socket.emit('webrtc:ice-candidate', {
          targetSocketId: remoteSocketRef.current,
          candidate: event.candidate,
        });
      }
    };

    pc.ontrack = (event) => {
      const stream = event.streams?.[0];
      const streamId = stream?.id;
      const mapping = remoteMediaMapRef.current;
      const isScreen = streamId && mapping.screenStreamId === streamId;
      const target = isScreen ? remoteScreenStreamRef.current : remoteCameraStreamRef.current;
      if (event.track && !target.getTracks().some((track) => track.id === event.track.id)) {
        target.addTrack(event.track);
      }
      attachRemoteStreams();
      setConnected(true);
      if (isScreen) setRemoteScreenVisible(true);
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      setConnected(state === 'connected');
      if (state === 'failed') {
        setError('Peer connection failed. Check both devices are on a reachable network and retry media.');
      }
    };

    pc.onnegotiationneeded = async () => {
      try {
        if (makingOfferRef.current || pc.signalingState !== 'stable') return;
        makingOfferRef.current = true;
        const offer = await pc.createOffer();
        if (pc.signalingState !== 'stable') return;
        await pc.setLocalDescription(offer);
        if (remoteSocketRef.current && socket) {
          socket.emit('webrtc:offer', {
            roomId: roomCode.toUpperCase(),
            sdp: pc.localDescription,
            media: mediaMetadata(),
          });
        }
      } catch (err) {
        console.warn('[WebRTC] Negotiation failed:', err);
      } finally {
        makingOfferRef.current = false;
      }
    };

    return pc;
  }, [attachRemoteStreams, mediaMetadata, roomCode, socket]);

  const drainPendingIceCandidates = useCallback(async (pc) => {
    const pending = pendingIceCandidatesRef.current.splice(0);
    for (const candidate of pending) {
      try {
        await pc.addIceCandidate(candidate);
      } catch (err) {
        console.warn('[WebRTC] Queued ICE candidate rejected:', err?.message || err);
      }
    }
  }, []);

  const addLocalTracks = useCallback(() => {
    const pc = createPeer();
    const local = localStreamRef.current;
    if (local) {
      const videoTrack = local.getVideoTracks()[0];
      const audioTrack = local.getAudioTracks()[0];
      if (videoTrack && !cameraSenderRef.current) {
        cameraSenderRef.current = pc.addTrack(videoTrack, local);
      }
      if (audioTrack && !audioSenderRef.current) {
        audioSenderRef.current = pc.addTrack(audioTrack, local);
      }
    }
    const screenTrack = screenStreamRef.current?.getVideoTracks()[0];
    if (screenTrack && !screenSenderRef.current) {
      screenSenderRef.current = pc.addTrack(screenTrack, screenStreamRef.current);
    }
    return pc;
  }, [createPeer]);

  const handleOffer = useCallback(async ({ sdp, senderSocketId, media }) => {
    if (!socket || !sdp) return;
    remoteSocketRef.current = senderSocketId;
    remoteMediaMapRef.current = media || {};
    const pc = createPeer();
    try {
      const offerCollision = makingOfferRef.current || pc.signalingState !== 'stable';
      ignoreOfferRef.current = !polite && offerCollision;
      if (ignoreOfferRef.current) return;
      if (offerCollision) await pc.setLocalDescription({ type: 'rollback' });
      await pc.setRemoteDescription(sdp);
      await drainPendingIceCandidates(pc);
      addLocalTracks();
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('webrtc:answer', {
        targetSocketId: senderSocketId,
        sdp: pc.localDescription,
        media: mediaMetadata(),
      });
    } catch (err) {
      console.error('[WebRTC] Offer handling failed:', err);
      setError('Unable to negotiate the interview media connection.');
    }
  }, [addLocalTracks, createPeer, drainPendingIceCandidates, mediaMetadata, polite, socket]);

  useEffect(() => {
    if (!socket || !roomCode) return undefined;
    const room = roomCode.toUpperCase();
    createPeer();

    const onAnswer = async ({ sdp, senderSocketId, media }) => {
      remoteSocketRef.current = senderSocketId || remoteSocketRef.current;
      remoteMediaMapRef.current = media || remoteMediaMapRef.current;
      try {
        if (pcRef.current && sdp) {
          await pcRef.current.setRemoteDescription(sdp);
          await drainPendingIceCandidates(pcRef.current);
        }
      } catch (err) {
        console.error('[WebRTC] Answer handling failed:', err);
        setError('Unable to complete the media connection.');
      }
    };
    const onIce = async ({ candidate, senderSocketId }) => {
      remoteSocketRef.current = senderSocketId || remoteSocketRef.current;
      if (!candidate || !pcRef.current) return;
      const pc = pcRef.current;
      if (!pc.remoteDescription) {
        pendingIceCandidatesRef.current.push(candidate);
        return;
      }
      try {
        await pc.addIceCandidate(candidate);
      } catch (err) {
        if (!ignoreOfferRef.current) console.warn('[WebRTC] ICE candidate rejected:', err.message);
      }
    };
    const onOfferRequest = ({ requesterSocketId }) => {
      if (requesterSocketId) remoteSocketRef.current = requesterSocketId;
      const pc = pcRef.current;
      if (!pc) return;
      // If we already have local media, onnegotiationneeded will create the offer.
      if (localStreamRef.current || screenStreamRef.current) {
        addLocalTracks();
        pc.dispatchEvent(new Event('negotiationneeded'));
      }
    };
    const onScreenShare = ({ sharing }) => {
      if (!sharing) {
        remoteScreenStreamRef.current.getTracks().forEach((track) => remoteScreenStreamRef.current.removeTrack(track));
        setRemoteScreenVisible(false);
        attachRemoteStreams();
      }
    };
    const onRoomError = ({ message }) => setError(message || 'Unable to join the interview room.');

    socket.on('webrtc:offer', handleOffer);
    socket.on('webrtc:answer', onAnswer);
    socket.on('webrtc:ice-candidate', onIce);
    socket.on('webrtc:request-offer', onOfferRequest);
    socket.on('webrtc:screen-share', onScreenShare);
    socket.on('room:error', onRoomError);

    socket.emit('webrtc:request-offer', { roomId: room });

    return () => {
      socket.off('webrtc:offer', handleOffer);
      socket.off('webrtc:answer', onAnswer);
      socket.off('webrtc:ice-candidate', onIce);
      socket.off('webrtc:request-offer', onOfferRequest);
      socket.off('webrtc:screen-share', onScreenShare);
      socket.off('room:error', onRoomError);
      pcRef.current?.close();
      pcRef.current = null;
      cameraSenderRef.current = null;
      audioSenderRef.current = null;
      screenSenderRef.current = null;
      remoteSocketRef.current = null;
      pendingIceCandidatesRef.current = [];
    };
  }, [addLocalTracks, attachRemoteStreams, createPeer, handleOffer, roomCode, socket]);

  useEffect(() => () => {
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    screenStreamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  const startMedia = async () => {
    try {
      setError('');
      if (!window.isSecureContext) throw new Error('Camera/microphone and screen sharing require HTTPS on phones. Use an HTTPS LAN URL or localhost.');
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera/microphone APIs are unavailable. Use HTTPS or localhost.');
      const stream = localStreamRef.current || await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      if (localVideo.current) {
        localVideo.current.srcObject = stream;
        await localVideo.current.play().catch(() => {});
      }
      stream.getVideoTracks().forEach((track) => { track.enabled = true; });
      stream.getAudioTracks().forEach((track) => { track.enabled = true; });
      setCamera(Boolean(stream.getVideoTracks().length));
      setMic(Boolean(stream.getAudioTracks().length));
      addLocalTracks();
      socket?.emit('webrtc:request-offer', { roomId: roomCode.toUpperCase() });
    } catch (err) {
      setError(err?.name === 'NotAllowedError' ? 'Camera/microphone permission was denied. Allow both permissions in the browser and retry.' : (err.message || 'Unable to access camera and microphone.'));
    }
  };

  const toggleCamera = async () => {
    if (!localStreamRef.current) return startMedia();
    const next = !camera;
    localStreamRef.current.getVideoTracks().forEach((track) => { track.enabled = next; });
    setCamera(next);
  };

  const toggleMic = async () => {
    if (!localStreamRef.current) return startMedia();
    const next = !mic;
    localStreamRef.current.getAudioTracks().forEach((track) => { track.enabled = next; });
    setMic(next);
  };

  const stopScreenShare = useCallback(() => {
    screenStreamRef.current?.getTracks().forEach((track) => {
      track.onended = null;
      track.stop();
    });
    screenStreamRef.current = null;
    if (screenSenderRef.current && pcRef.current) {
      pcRef.current.removeTrack(screenSenderRef.current);
      screenSenderRef.current = null;
    }
    setScreen(false);
    socket?.emit('webrtc:screen-share', { roomId: roomCode.toUpperCase(), sharing: false });
  }, [roomCode, socket]);

  const shareScreen = async () => {
    try {
      setError('');
      if (screen) {
        stopScreenShare();
        return;
      }
      if (!window.isSecureContext) throw new Error('Screen sharing requires HTTPS on phones.');
      if (!navigator.mediaDevices?.getDisplayMedia) throw new Error('Screen sharing is not supported by this browser.');
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      screenStreamRef.current = stream;
      const track = stream.getVideoTracks()[0];
      if (!track) throw new Error('No screen video track was provided by the browser.');
      const pc = createPeer();
      screenSenderRef.current = pc.addTrack(track, stream);
      track.onended = () => stopScreenShare();
      setScreen(true);
      socket?.emit('webrtc:screen-share', { roomId: roomCode.toUpperCase(), sharing: true });
    } catch (err) {
      if (err?.name !== 'AbortError') setError(err.message || 'Unable to start screen sharing.');
    }
  };

  const remoteScreenHasTracks = remoteScreenVisible && remoteScreenStreamRef.current.getVideoTracks().length > 0;

  return (
    <section className="rounded-lg border border-arena-border bg-arena-panel overflow-hidden">
      <div className="px-3 py-2 border-b border-arena-border flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wider text-arena-dim">Live Interview Media</span>
        <span className={`text-[10px] font-semibold ${connected ? 'text-emerald-400' : 'text-slate-500'}`}>{connected ? '● Connected' : '○ Waiting'}</span>
      </div>
      <div className="grid grid-cols-2 gap-2 p-2">
        <div className="relative aspect-video rounded-md overflow-hidden bg-black">
          <video ref={isCompany ? remoteCameraVideo : localVideo} autoPlay playsInline muted={!isCompany} className="w-full h-full object-cover" />
          <span className="absolute left-2 bottom-2 text-[9px] bg-black/60 px-1.5 py-1 rounded">{isCompany ? 'Student camera' : 'Your camera'}</span>
        </div>
        <div className="relative aspect-video rounded-md overflow-hidden bg-black">
          <video ref={isCompany ? localVideo : remoteCameraVideo} autoPlay playsInline muted={isCompany} className="w-full h-full object-cover" />
          <span className="absolute left-2 bottom-2 text-[9px] bg-black/60 px-1.5 py-1 rounded">{isCompany ? 'Your camera' : 'Company camera'}</span>
        </div>
      </div>
      <div className={`mx-2 mb-2 relative aspect-video rounded-md overflow-hidden bg-black border ${remoteScreenHasTracks ? 'border-blue-500/50' : 'border-arena-border'}`}>
        <video ref={remoteScreenVideo} autoPlay playsInline muted className="w-full h-full object-contain" />
        {!remoteScreenHasTracks && <div className="absolute inset-0 flex items-center justify-center text-[10px] text-arena-dim">Remote screen share will appear here</div>}
        <span className="absolute left-2 top-2 text-[9px] bg-black/60 px-1.5 py-1 rounded">Remote screen</span>
      </div>
      <div className="px-2 pb-2 flex flex-wrap gap-1.5">
        <button onClick={startMedia} className="px-2 py-1.5 rounded bg-blue-600 text-[10px] font-semibold"><Camera size={12} className="inline mr-1"/>Enable media</button>
        <button onClick={toggleCamera} disabled={!localStreamRef.current} className="px-2 py-1.5 rounded border border-arena-border text-[10px] disabled:opacity-40">{camera ? <CameraOff size={12}/> : <Camera size={12}/>}</button>
        <button onClick={toggleMic} disabled={!localStreamRef.current} className="px-2 py-1.5 rounded border border-arena-border text-[10px] disabled:opacity-40">{mic ? <MicOff size={12}/> : <Mic size={12}/>}</button>
        <button onClick={shareScreen} className="px-2 py-1.5 rounded border border-arena-border text-[10px]">{screen ? <MonitorOff size={12}/> : <MonitorUp size={12}/>}</button>
      </div>
      {isCompany && <div className="px-2 pb-2 text-[10px] text-arena-dim flex items-center gap-1"><PhoneCall size={12}/> Camera, microphone and screen are peer-to-peer; video is not stored by default.</div>}
      {error && <div className="px-2 pb-2 text-[10px] text-rose-400">{error}</div>}
    </section>
  );
}
