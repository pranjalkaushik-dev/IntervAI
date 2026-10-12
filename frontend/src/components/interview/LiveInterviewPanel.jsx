import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, MonitorUp, MonitorOff, Mic, MicOff, PhoneCall, RefreshCw } from 'lucide-react';
import { useSocket } from '../../context/SocketContext';

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
];

export default function LiveInterviewPanel({
  roomCode,
  isCompany,
  onMediaStatusChange,
  onRegisterMediaControls,
}) {
  const { socket } = useSocket();
  const socketRef = useRef(socket);
  useEffect(() => {
    socketRef.current = socket;
  }, [socket]);

  // Video element refs
  const localVideo = useRef(null);
  const remoteCameraVideo = useRef(null);
  const remoteScreenVideo = useRef(null);

  // WebRTC & Media refs
  const pcRef = useRef(null);
  const remoteSocketRef = useRef(null);
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const cameraSenderRef = useRef(null);
  const audioSenderRef = useRef(null);
  const screenSenderRef = useRef(null);
  const remoteCameraStreamRef = useRef(new MediaStream());
  const remoteScreenStreamRef = useRef(new MediaStream());
  const remoteMediaMapRef = useRef({ cameraStreamId: null, screenStreamId: null, screenTrackId: null });
  const remoteScreenInfoRef = useRef({ active: false, streamId: null, trackId: null });

  // Signaling state refs (MDN Perfect Negotiation)
  const pendingIceCandidatesRef = useRef([]);
  const makingOfferRef = useRef(false);
  const ignoreOfferRef = useRef(false);
  const isSettingRemoteAnswerPendingRef = useRef(false);

  // Component UI state
  const [camera, setCamera] = useState(false);
  const [mic, setMic] = useState(false);
  const [screen, setScreen] = useState(false);
  const [connected, setConnected] = useState(false);
  const [remoteHasVideo, setRemoteHasVideo] = useState(false);
  const [error, setError] = useState('');
  const [remoteScreenVisible, setRemoteScreenVisible] = useState(false);
  const [remoteScreenHasTracks, setRemoteScreenHasTracks] = useState(false);

  // Guarantee strictly asymmetric polite/impolite assignment even when both tabs have the same role/account
  const isPolite = useCallback(() => {
    const myId = socketRef.current?.id || '';
    const otherId = remoteSocketRef.current || '';
    if (myId && otherId && myId !== otherId) {
      return myId < otherId;
    }
    return Boolean(isCompany);
  }, [isCompany]);

  // Stable parent callback refs
  const onMediaStatusChangeRef = useRef(onMediaStatusChange);
  useEffect(() => {
    onMediaStatusChangeRef.current = onMediaStatusChange;
  });

  const onRegisterMediaControlsRef = useRef(onRegisterMediaControls);
  useEffect(() => {
    onRegisterMediaControlsRef.current = onRegisterMediaControls;
  });

  const mediaMetadata = useCallback(() => ({
    cameraStreamId: localStreamRef.current?.id || null,
    screenStreamId: screenStreamRef.current?.id || null,
    screenTrackId: screenStreamRef.current?.getVideoTracks()[0]?.id || null,
  }), []);

  // Imperatively attach media streams to video elements and start playback
  const attachStreams = useCallback(() => {
    if (localVideo.current && localStreamRef.current) {
      if (localVideo.current.srcObject !== localStreamRef.current) {
        localVideo.current.srcObject = localStreamRef.current;
      }
      localVideo.current.play().catch(() => {});
    }
    if (remoteCameraVideo.current && remoteCameraStreamRef.current) {
      if (remoteCameraVideo.current.srcObject !== remoteCameraStreamRef.current) {
        remoteCameraVideo.current.srcObject = remoteCameraStreamRef.current;
      }
      remoteCameraVideo.current.play().catch(() => {});
    }
    if (remoteScreenVideo.current && remoteScreenStreamRef.current) {
      if (remoteScreenVideo.current.srcObject !== remoteScreenStreamRef.current) {
        remoteScreenVideo.current.srcObject = remoteScreenStreamRef.current;
      }
      remoteScreenVideo.current.play().catch(() => {});
    }
  }, []);

  // Flush queued ICE candidates after setRemoteDescription
  const drainPendingIceCandidates = useCallback(async (pc) => {
    const pending = pendingIceCandidatesRef.current.splice(0);
    for (const candidate of pending) {
      if (!candidate?.candidate) continue;
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.warn('[WebRTC] Queued ICE candidate rejected:', err?.message || err);
      }
    }
  }, []);

  // Add existing local media & screen tracks to RTCPeerConnection
  const addLocalTracks = useCallback(() => {
    const pc = pcRef.current;
    if (!pc) return;

    const local = localStreamRef.current;
    if (local) {
      const videoTrack = local.getVideoTracks()[0];
      const audioTrack = local.getAudioTracks()[0];
      if (videoTrack && !cameraSenderRef.current) {
        try {
          cameraSenderRef.current = pc.addTrack(videoTrack, local);
        } catch (_) {}
      }
      if (audioTrack && !audioSenderRef.current) {
        try {
          audioSenderRef.current = pc.addTrack(audioTrack, local);
        } catch (_) {}
      }
    }

    const screenTrack = screenStreamRef.current?.getVideoTracks()[0];
    if (screenTrack && !screenSenderRef.current) {
      try {
        screenSenderRef.current = pc.addTrack(screenTrack, screenStreamRef.current);
      } catch (_) {}
    }
  }, []);

  // Automatic connection recovery
  const recoverConnection = useCallback(() => {
    console.log('[WebRTC] Performing connection recovery...');
    setError('');
    if (pcRef.current) {
      try { pcRef.current.close(); } catch (_) {}
      pcRef.current = null;
    }
    cameraSenderRef.current = null;
    audioSenderRef.current = null;
    screenSenderRef.current = null;
    pendingIceCandidatesRef.current = [];
    makingOfferRef.current = false;
    isSettingRemoteAnswerPendingRef.current = false;

    const pc = createPeer();
    addLocalTracks();
    if (socketRef.current && roomCode) {
      socketRef.current.emit('webrtc:request-offer', { roomId: roomCode.toUpperCase() });
    }
  }, [addLocalTracks, roomCode]);

  // Initialize RTCPeerConnection instance
  const createPeer = useCallback(() => {
    if (pcRef.current) return pcRef.current;
    console.log('[WebRTC] Creating RTCPeerConnection with STUN servers');
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pcRef.current = pc;

    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current && roomCode) {
        const candidateData = event.candidate.toJSON ? event.candidate.toJSON() : event.candidate;
        socketRef.current.emit('webrtc:ice-candidate', {
          roomId: roomCode.toUpperCase(),
          targetSocketId: remoteSocketRef.current || undefined,
          candidate: candidateData,
        });
      }
    };

    pc.ontrack = (event) => {
      const track = event.track;
      if (!track) return;
      console.log('[WebRTC] ontrack received track kind:', track.kind, 'id:', track.id);

      if (track.kind === 'audio') {
        if (!remoteCameraStreamRef.current.getAudioTracks().some((t) => t.id === track.id)) {
          remoteCameraStreamRef.current.addTrack(track);
        }
        attachStreams();
        setConnected(true);
        setError('');
        return;
      }

      // Track is video: determine whether it is screen sharing or remote camera
      const streamId = event.streams?.[0]?.id;
      const screenInfo = remoteScreenInfoRef.current;
      const mapping = remoteMediaMapRef.current;

      const isScreenTrack =
        (screenInfo.active && (screenInfo.trackId === track.id || screenInfo.streamId === streamId)) ||
        (mapping.screenTrackId && mapping.screenTrackId === track.id) ||
        (mapping.screenStreamId && mapping.screenStreamId === streamId) ||
        (screenInfo.active && remoteCameraStreamRef.current.getVideoTracks().length > 0);

      if (isScreenTrack) {
        console.log('[WebRTC] Assigned incoming video track to REMOTE SCREEN STREAM');
        if (!remoteScreenStreamRef.current.getVideoTracks().some((t) => t.id === track.id)) {
          remoteScreenStreamRef.current.addTrack(track);
        }
        setRemoteScreenVisible(true);
        setRemoteScreenHasTracks(true);
      } else {
        console.log('[WebRTC] Assigned incoming video track to REMOTE CAMERA STREAM');
        if (!remoteCameraStreamRef.current.getVideoTracks().some((t) => t.id === track.id)) {
          remoteCameraStreamRef.current.addTrack(track);
        }
        setRemoteHasVideo(true);
      }

      attachStreams();
      setConnected(true);
      setError('');

      track.onended = () => {
        console.log('[WebRTC] Remote track ended:', track.kind, track.id);
        if (isScreenTrack) {
          remoteScreenStreamRef.current.removeTrack(track);
          if (remoteScreenStreamRef.current.getVideoTracks().length === 0) {
            setRemoteScreenVisible(false);
            setRemoteScreenHasTracks(false);
          }
        } else {
          remoteCameraStreamRef.current.removeTrack(track);
          if (remoteCameraStreamRef.current.getVideoTracks().length === 0) {
            setRemoteHasVideo(false);
          }
        }
      };
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      console.log('[WebRTC] Peer connectionState:', state);
      if (state === 'connected') {
        setConnected(true);
        setError('');
      } else if (state === 'failed') {
        setConnected(false);
        console.warn('[WebRTC] Peer connection failed. Triggering recovery...');
        setError('Peer connection interrupted over Wi-Fi. Media will retry automatically.');
        setTimeout(() => {
          if (pcRef.current && pcRef.current.connectionState === 'failed') {
            recoverConnection();
          }
        }, 1500);
      } else if (state === 'closed') {
        setConnected(false);
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log('[WebRTC] Peer ICE connection state:', pc.iceConnectionState);
      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        setConnected(true);
        setError('');
      }
    };

    // MDN Perfect Negotiation: Triggered when tracks are added or removed
    pc.onnegotiationneeded = async () => {
      try {
        console.log('[WebRTC] onnegotiationneeded -> creating offer. signalingState:', pc.signalingState);
        makingOfferRef.current = true;
        await pc.setLocalDescription();
        if (socketRef.current && roomCode) {
          console.log('[WebRTC] Emitting webrtc:offer to room:', roomCode.toUpperCase());
          socketRef.current.emit('webrtc:offer', {
            roomId: roomCode.toUpperCase(),
            targetSocketId: remoteSocketRef.current || undefined,
            sdp: pc.localDescription,
            media: mediaMetadata(),
          });
        }
      } catch (err) {
        console.warn('[WebRTC] onnegotiationneeded error:', err);
      } finally {
        makingOfferRef.current = false;
      }
    };

    return pc;
  }, [attachStreams, mediaMetadata, recoverConnection, roomCode]);

  // Handle incoming offer using MDN Perfect Negotiation
  const handleOffer = useCallback(async ({ sdp, senderSocketId, media }) => {
    if (!socketRef.current || !sdp) return;
    console.log('[WebRTC] Received offer from:', senderSocketId);
    remoteSocketRef.current = senderSocketId;
    if (media) remoteMediaMapRef.current = media;
    const pc = createPeer();

    try {
      const politePeer = isPolite();
      const readyForOffer =
        !makingOfferRef.current &&
        (pc.signalingState === 'stable' || isSettingRemoteAnswerPendingRef.current);
      const offerCollision = sdp.type === 'offer' && !readyForOffer;

      ignoreOfferRef.current = !politePeer && offerCollision;
      if (ignoreOfferRef.current) {
        console.warn('[WebRTC] Impolite peer ignoring colliding offer from:', senderSocketId);
        return;
      }

      if (offerCollision) {
        console.log('[WebRTC] Polite peer rolling back local offer');
        await pc.setLocalDescription({ type: 'rollback' });
      }

      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      await drainPendingIceCandidates(pc);

      // Add local tracks if available so the answer includes reciprocal media
      addLocalTracks();

      await pc.setLocalDescription();
      console.log('[WebRTC] Emitting answer to:', senderSocketId);
      socketRef.current.emit('webrtc:answer', {
        roomId: roomCode?.toUpperCase(),
        targetSocketId: senderSocketId,
        sdp: pc.localDescription,
        media: mediaMetadata(),
      });
    } catch (err) {
      console.error('[WebRTC] Offer handling error:', err);
    }
  }, [addLocalTracks, createPeer, drainPendingIceCandidates, isPolite, mediaMetadata, roomCode]);

  // Handle incoming answer
  const handleAnswer = useCallback(async ({ sdp, senderSocketId, media }) => {
    if (!sdp || !pcRef.current) return;
    const pc = pcRef.current;

    if (pc.signalingState !== 'have-local-offer') {
      console.warn('[WebRTC] Ignoring answer while signalingState is:', pc.signalingState);
      return;
    }

    console.log('[WebRTC] Received answer from:', senderSocketId);
    remoteSocketRef.current = senderSocketId || remoteSocketRef.current;
    if (media) remoteMediaMapRef.current = media;

    try {
      isSettingRemoteAnswerPendingRef.current = true;
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      isSettingRemoteAnswerPendingRef.current = false;
      await drainPendingIceCandidates(pc);
      attachStreams();
      setError('');
    } catch (err) {
      isSettingRemoteAnswerPendingRef.current = false;
      console.error('[WebRTC] Answer handling error:', err);
    }
  }, [attachStreams, drainPendingIceCandidates]);

  // Handle incoming ICE candidate
  const handleIceCandidate = useCallback(async ({ candidate, senderSocketId }) => {
    if (!candidate || !candidate.candidate) return;
    remoteSocketRef.current = senderSocketId || remoteSocketRef.current;
    const pc = pcRef.current;

    if (!pc || !pc.remoteDescription) {
      pendingIceCandidatesRef.current.push(candidate);
      return;
    }

    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
      if (!ignoreOfferRef.current) {
        console.warn('[WebRTC] ICE candidate error:', err?.message || err);
      }
    }
  }, []);

  // Main Socket listener setup
  useEffect(() => {
    if (!socket || !roomCode) return undefined;
    const room = roomCode.toUpperCase();
    console.log('[WebRTC] Activating socket listeners for room:', room);
    createPeer();

    const onOffer = (data) => handleOffer(data);
    const onAnswer = (data) => handleAnswer(data);
    const onIce = (data) => handleIceCandidate(data);

    const onUserJoined = ({ socketId, userName }) => {
      console.log('[WebRTC] Remote peer joined room:', userName, socketId);
      remoteSocketRef.current = socketId;
      const pc = createPeer();
      addLocalTracks();
      if (pc.signalingState === 'stable' && !makingOfferRef.current) {
        if (localStreamRef.current || screenStreamRef.current) {
          pc.onnegotiationneeded?.();
        }
      }
    };

    const onOfferRequest = async ({ requesterSocketId }) => {
      console.log('[WebRTC] Received request-offer from:', requesterSocketId);
      if (requesterSocketId) remoteSocketRef.current = requesterSocketId;
      const pc = createPeer();
      addLocalTracks();

      if (pc.signalingState === 'stable' && !makingOfferRef.current) {
        if (localStreamRef.current || screenStreamRef.current || !isPolite()) {
          try {
            makingOfferRef.current = true;
            await pc.setLocalDescription();
            socket.emit('webrtc:offer', {
              roomId: room,
              targetSocketId: requesterSocketId || undefined,
              sdp: pc.localDescription,
              media: mediaMetadata(),
            });
          } catch (err) {
            console.warn('[WebRTC] Offer on request error:', err);
          } finally {
            makingOfferRef.current = false;
          }
        }
      }
    };

    const onScreenShare = ({ sharing, streamId, trackId }) => {
      console.log('[WebRTC] Received webrtc:screen-share event:', { sharing, streamId, trackId });
      if (sharing) {
        remoteScreenInfoRef.current = { active: true, streamId, trackId };
        setRemoteScreenVisible(true);
      } else {
        remoteScreenInfoRef.current = { active: false, streamId: null, trackId: null };
        remoteScreenStreamRef.current.getTracks().forEach((t) => {
          t.stop();
          remoteScreenStreamRef.current.removeTrack(t);
        });
        setRemoteScreenVisible(false);
        setRemoteScreenHasTracks(false);
        attachStreams();
      }
    };

    const onRoomError = ({ message }) => setError(message || 'Unable to join interview media room.');

    socket.on('webrtc:offer', onOffer);
    socket.on('webrtc:answer', onAnswer);
    socket.on('webrtc:ice-candidate', onIce);
    socket.on('webrtc:request-offer', onOfferRequest);
    socket.on('webrtc:screen-share', onScreenShare);
    socket.on('user-joined', onUserJoined);
    socket.on('room:error', onRoomError);

    // Broadcast readiness to peers already in the room
    socket.emit('webrtc:request-offer', { roomId: room });

    return () => {
      console.log('[WebRTC] Cleaning up socket listeners for room:', room);
      socket.off('webrtc:offer', onOffer);
      socket.off('webrtc:answer', onAnswer);
      socket.off('webrtc:ice-candidate', onIce);
      socket.off('webrtc:request-offer', onOfferRequest);
      socket.off('webrtc:screen-share', onScreenShare);
      socket.off('user-joined', onUserJoined);
      socket.off('room:error', onRoomError);

      pcRef.current?.close();
      pcRef.current = null;
      cameraSenderRef.current = null;
      audioSenderRef.current = null;
      screenSenderRef.current = null;
      remoteSocketRef.current = null;
      pendingIceCandidatesRef.current = [];
    };
  }, [addLocalTracks, createPeer, handleAnswer, handleIceCandidate, handleOffer, isPolite, mediaMetadata, roomCode, socket]);

  // Clean up media tracks on unmount
  useEffect(() => () => {
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    screenStreamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  // Guarantee stream attachment on state/tab updates
  useEffect(() => {
    attachStreams();
  }, [attachStreams, camera, remoteHasVideo, remoteScreenVisible, remoteScreenHasTracks]);

  // Start local webcam and mic
  const startMedia = useCallback(async () => {
    try {
      setError('');
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error(
          'Camera/microphone is blocked by your browser. If accessing over local Wi-Fi, open chrome://flags/#unsafely-treat-insecure-origin-as-secure in Chrome/Edge, add ' +
            window.location.origin +
            ', set to Enabled and relaunch.'
        );
      }
      const stream =
        localStreamRef.current ||
        (await navigator.mediaDevices.getUserMedia({ video: true, audio: true }));
      localStreamRef.current = stream;

      stream.getVideoTracks().forEach((track) => {
        track.enabled = true;
      });
      stream.getAudioTracks().forEach((track) => {
        track.enabled = true;
      });

      setCamera(Boolean(stream.getVideoTracks().length));
      setMic(Boolean(stream.getAudioTracks().length));

      const pc = createPeer();
      addLocalTracks();
      attachStreams();

      console.log('[WebRTC] Local media enabled. Initiating peer negotiation for room:', roomCode?.toUpperCase());
      if (pc.signalingState === 'stable' && !makingOfferRef.current) {
        pc.onnegotiationneeded?.();
      }
    } catch (err) {
      console.error('[WebRTC] startMedia error:', err);
      setError(
        err?.name === 'NotAllowedError'
          ? 'Camera/microphone permission was denied. Please allow permissions in your browser address bar and retry.'
          : err.message || 'Unable to access camera and microphone.'
      );
    }
  }, [addLocalTracks, attachStreams, createPeer, roomCode]);

  const toggleCamera = useCallback(async () => {
    if (!localStreamRef.current) return startMedia();
    const next = !camera;
    localStreamRef.current.getVideoTracks().forEach((track) => {
      track.enabled = next;
    });
    setCamera(next);
  }, [camera, startMedia]);

  const toggleMic = useCallback(async () => {
    if (!localStreamRef.current) return startMedia();
    const next = !mic;
    localStreamRef.current.getAudioTracks().forEach((track) => {
      track.enabled = next;
    });
    setMic(next);
  }, [mic, startMedia]);

  const stopScreenShare = useCallback(() => {
    screenStreamRef.current?.getTracks().forEach((track) => {
      track.onended = null;
      track.stop();
    });
    screenStreamRef.current = null;
    if (screenSenderRef.current && pcRef.current) {
      try {
        pcRef.current.removeTrack(screenSenderRef.current);
      } catch (_) {}
      screenSenderRef.current = null;
    }
    setScreen(false);
    socketRef.current?.emit('webrtc:screen-share', {
      roomId: roomCode?.toUpperCase(),
      sharing: false,
    });
  }, [roomCode]);

  const shareScreen = useCallback(async () => {
    try {
      setError('');
      if (screen) {
        stopScreenShare();
        return;
      }
      if (!navigator.mediaDevices?.getDisplayMedia) {
        throw new Error('Screen sharing is not supported by this browser or blocked over HTTP.');
      }
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      screenStreamRef.current = stream;
      const track = stream.getVideoTracks()[0];
      if (!track) throw new Error('No screen video track was provided by the browser.');

      const pc = createPeer();
      screenSenderRef.current = pc.addTrack(track, stream);
      track.onended = () => stopScreenShare();
      setScreen(true);

      console.log('[WebRTC] Screen sharing active. Emitting webrtc:screen-share');
      socketRef.current?.emit('webrtc:screen-share', {
        roomId: roomCode?.toUpperCase(),
        sharing: true,
        streamId: stream.id,
        trackId: track.id,
      });

      if (pc.signalingState === 'stable' && !makingOfferRef.current) {
        pc.onnegotiationneeded?.();
      }
    } catch (err) {
      if (err?.name !== 'AbortError') setError(err.message || 'Unable to start screen sharing.');
    }
  }, [createPeer, roomCode, screen, stopScreenShare]);

  // Report media telemetry to parent RoomHeader
  useEffect(() => {
    onMediaStatusChangeRef.current?.({
      camera,
      mic,
      screen,
      connected,
      remoteScreenVisible: remoteScreenHasTracks,
    });
  }, [camera, mic, screen, connected, remoteScreenHasTracks]);

  // Register controls for toolbar invocation
  useEffect(() => {
    onRegisterMediaControlsRef.current?.({
      toggleCamera,
      toggleMic,
      shareScreen,
      startMedia,
    });
  }, [toggleCamera, toggleMic, shareScreen, startMedia]);

  return (
    <section className="bg-white border border-[#DFE5EF] rounded-xl overflow-hidden shadow-sm">
      <div className="px-3.5 py-2.5 border-b border-[#EEF2F8] flex items-center justify-between bg-white">
        <div className="flex items-center gap-2">
          <Camera size={14} className="text-[#365FEA]" />
          <span className="text-xs font-bold text-[#172033]">Live Interview Media</span>
        </div>
        <span className={`text-[11px] font-semibold flex items-center gap-1.5 ${connected ? 'text-[#16A34A]' : 'text-[#8592A6]'}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-[#16A34A] animate-pulse' : 'bg-[#8592A6]'}`} />
          <span>{connected ? 'Peer Connected' : 'Waiting for peer...'}</span>
        </span>
      </div>

      <div className="p-3 space-y-2.5 bg-white">
        {/* Participant Video Tiles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {/* Tile 1: Candidate / Student */}
          <div className="relative aspect-video rounded-lg overflow-hidden border border-[#DFE5EF] bg-[#0F172A] flex items-center justify-center">
            <video
              ref={(el) => {
                if (isCompany) {
                  remoteCameraVideo.current = el;
                  if (el && el.srcObject !== remoteCameraStreamRef.current) {
                    el.srcObject = remoteCameraStreamRef.current;
                    el.play().catch(() => {});
                  }
                } else {
                  localVideo.current = el;
                  if (el && localStreamRef.current && el.srcObject !== localStreamRef.current) {
                    el.srcObject = localStreamRef.current;
                    el.play().catch(() => {});
                  }
                }
              }}
              autoPlay
              playsInline
              muted={!isCompany}
              className="w-full h-full object-cover"
            />
            {(!isCompany && !camera) || (isCompany && !remoteHasVideo) ? (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-2 text-center select-none bg-[#F8FAFC]">
                <div className="w-8 h-8 rounded-full bg-[#EEF2F8] text-[#8592A6] flex items-center justify-center mb-1">
                  <CameraOff size={15} />
                </div>
                <span className="text-[11px] font-medium text-[#596579]">
                  {isCompany ? 'Waiting for candidate camera...' : 'Your camera is off'}
                </span>
                {isCompany && (
                  <span className="text-[10px] text-[#8592A6] mt-0.5">
                    Candidate must click &quot;Enable Camera & Mic&quot;
                  </span>
                )}
              </div>
            ) : null}
            <span className="absolute left-2 bottom-2 z-20 text-[9px] font-bold bg-white/90 backdrop-blur-xs border border-[#DFE5EF] text-[#172033] px-1.5 py-0.5 rounded shadow-xs">
              {isCompany ? 'Candidate' : 'You (Candidate)'}
            </span>
          </div>

          {/* Tile 2: Company / Interviewer */}
          <div className="relative aspect-video rounded-lg overflow-hidden border border-[#DFE5EF] bg-[#0F172A] flex items-center justify-center">
            <video
              ref={(el) => {
                if (isCompany) {
                  localVideo.current = el;
                  if (el && localStreamRef.current && el.srcObject !== localStreamRef.current) {
                    el.srcObject = localStreamRef.current;
                    el.play().catch(() => {});
                  }
                } else {
                  remoteCameraVideo.current = el;
                  if (el && el.srcObject !== remoteCameraStreamRef.current) {
                    el.srcObject = remoteCameraStreamRef.current;
                    el.play().catch(() => {});
                  }
                }
              }}
              autoPlay
              playsInline
              muted={isCompany}
              className="w-full h-full object-cover"
            />
            {(isCompany && !camera) || (!isCompany && !remoteHasVideo) ? (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-2 text-center select-none bg-[#F8FAFC]">
                <div className="w-8 h-8 rounded-full bg-[#EEF2F8] text-[#8592A6] flex items-center justify-center mb-1">
                  <CameraOff size={15} />
                </div>
                <span className="text-[11px] font-medium text-[#596579]">
                  {isCompany ? 'Your camera is off' : 'Waiting for interviewer camera...'}
                </span>
              </div>
            ) : null}
            <span className="absolute left-2 bottom-2 z-20 text-[9px] font-bold bg-white/90 backdrop-blur-xs border border-[#DFE5EF] text-[#172033] px-1.5 py-0.5 rounded shadow-xs">
              {isCompany ? 'You (Interviewer)' : 'Interviewer'}
            </span>
          </div>
        </div>

        {/* Remote Screen Share (Displayed whenever remote screen is streaming) */}
        {(remoteScreenVisible || remoteScreenHasTracks) && (
          <div className="relative aspect-video rounded-lg overflow-hidden border-2 border-[#365FEA] bg-[#F8FAFC]">
            <video
              ref={(el) => {
                remoteScreenVideo.current = el;
                if (el && el.srcObject !== remoteScreenStreamRef.current) {
                  el.srcObject = remoteScreenStreamRef.current;
                  el.play().catch(() => {});
                }
              }}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-contain bg-white"
            />
            <span className="absolute left-2 top-2 text-[9px] font-bold bg-white/90 border border-[#DFE5EF] text-[#365FEA] px-2 py-0.5 rounded shadow-xs">
              Remote Screen Sharing Active
            </span>
          </div>
        )}

        {/* Media Controls Toolbar */}
        <div className="pt-1 flex flex-wrap items-center gap-1.5">
          {!localStreamRef.current ? (
            <button
              onClick={startMedia}
              className="h-8 px-3 rounded-lg bg-[#365FEA] hover:bg-[#2B4DC7] text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Camera size={13} />
              <span>Enable Camera & Mic</span>
            </button>
          ) : (
            <>
              <button
                onClick={toggleCamera}
                className={`h-8 px-2.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  camera
                    ? 'bg-white border-[#DFE5EF] text-[#172033] hover:bg-[#F5F7FB]'
                    : 'bg-[#FEF2F2] border-[#FECACA] text-[#DC2626]'
                }`}
                title={camera ? 'Turn Camera Off' : 'Turn Camera On'}
              >
                {camera ? <Camera size={13} /> : <CameraOff size={13} />}
                <span>{camera ? 'Camera On' : 'Camera Off'}</span>
              </button>

              <button
                onClick={toggleMic}
                className={`h-8 px-2.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  mic
                    ? 'bg-white border-[#DFE5EF] text-[#172033] hover:bg-[#F5F7FB]'
                    : 'bg-[#FEF2F2] border-[#FECACA] text-[#DC2626]'
                }`}
                title={mic ? 'Mute Microphone' : 'Unmute Microphone'}
              >
                {mic ? <Mic size={13} /> : <MicOff size={13} />}
                <span>{mic ? 'Mic On' : 'Muted'}</span>
              </button>

              <button
                onClick={shareScreen}
                className={`h-8 px-2.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  screen
                    ? 'bg-[#EFF6FF] border-[#BFDBFE] text-[#2563EB]'
                    : 'bg-white border-[#DFE5EF] text-[#172033] hover:bg-[#F5F7FB]'
                }`}
                title={screen ? 'Stop Sharing Screen' : 'Share Screen'}
              >
                {screen ? <MonitorOff size={13} /> : <MonitorUp size={13} />}
                <span>{screen ? 'Stop Share' : 'Share Screen'}</span>
              </button>
            </>
          )}
        </div>

        {error && (
          <div className="p-2.5 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-[#DC2626] text-[11px] font-medium leading-relaxed flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={recoverConnection}
              className="ml-2 px-2.5 py-1 rounded bg-[#DC2626] hover:bg-[#B91C1C] text-white text-[10px] font-bold flex items-center gap-1 shadow-xs transition-colors shrink-0"
              title="Retry WebRTC media connection"
            >
              <RefreshCw size={11} />
              <span>Retry</span>
            </button>
          </div>
        )}
      </div>

      <div className="px-3.5 py-2 text-[10px] text-[#596579] flex items-center gap-1.5 bg-[#F8FAFC] border-t border-[#EEF2F8]">
        <PhoneCall size={12} className="text-[#8592A6]" />
        <span>End-to-end WebRTC peer media stream. No video recorded by default.</span>
      </div>
    </section>
  );
}
