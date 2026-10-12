import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';

// Context to expose the dual camera streams and control functions
const DualCamContext = createContext(null);

/**
 * DualCamProvider sets up WebRTC peer connections for the dual camera feature.
 * It uses Socket.IO as the signaling channel (events: webrtc:offer, webrtc:answer,
 * webrtc:ice-candidate, webrtc:request-offer). The provider expects a `roomId`
 * prop that identifies the interview room. It exposes local and remote video
 * streams, a `ready` flag, and a `reset` function.
 */
export const DualCamProvider = ({ roomId, children }) => {
  const { socket } = useSocket();
  const { user } = useAuth();
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const [ready, setReady] = useState(false);
  const peerConnectionRef = useRef(null);
  const remoteSocketRef = useRef(null);

  // STUN servers for NAT traversal – adjust if you have TURN.
  const iceServers = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      // Add TURN server config here if needed
    ],
  };

  // Helper to create a new RTCPeerConnection and bind event listeners
  const createPeerConnection = () => {
    const pc = new RTCPeerConnection(iceServers);
    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('webrtc:ice-candidate', {
          targetSocketId: remoteSocketRef.current,
          roomId,
          candidate: event.candidate,
        });
      }
    };
    pc.ontrack = (event) => {
      // Remote stream received
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };
    return pc;
  };

  // Start local media and add tracks to the PeerConnection
  const startLocalStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      // Add each track to the peer connection
      stream.getTracks().forEach((track) => {
        peerConnectionRef.current.addTrack(track, stream);
      });
    } catch (err) {
      console.error('Failed to get local media:', err);
    }
  };

  // Offer creation – called by the initiator (e.g., STUDENT role)
  const createOffer = async () => {
    const pc = peerConnectionRef.current;
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit('webrtc:offer', { roomId, sdp: offer });
  };

  // Answer creation – called when an offer is received
  const handleOffer = async ({ sdp, senderSocketId }) => {
    remoteSocketRef.current = senderSocketId;
    const pc = peerConnectionRef.current;
    await pc.setRemoteDescription(new RTCSessionDescription(sdp));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socket.emit('webrtc:answer', { targetSocketId: senderSocketId, sdp: answer });
  };

  // Handle incoming answer
  const handleAnswer = async ({ sdp, senderSocketId }) => {
    remoteSocketRef.current = senderSocketId || remoteSocketRef.current;
    const pc = peerConnectionRef.current;
    await pc.setRemoteDescription(new RTCSessionDescription(sdp));
  };

  // Handle incoming ICE candidate
  const handleIceCandidate = async ({ candidate }) => {
    const pc = peerConnectionRef.current;
    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (e) {
      console.error('Error adding received ice candidate', e);
    }
  };

  // Request an offer from the peer – used when joining a room after the initiator
  const requestOffer = () => {
    socket.emit('webrtc:request-offer', { roomId });
  };

  // Cleanup function
  const cleanup = () => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }
    peerConnectionRef.current = null;
    remoteSocketRef.current = null;
    setReady(false);
  };

  // Effect to set up the connection once the socket is ready
  useEffect(() => {
    if (!socket) return;

    // Initialise peer connection and local media
    peerConnectionRef.current = createPeerConnection();
    startLocalStream();

    // Listen for signaling events
    socket.on('webrtc:offer', handleOffer);
    socket.on('webrtc:answer', handleAnswer);
    socket.on('webrtc:ice-candidate', handleIceCandidate);
    socket.on('webrtc:request-offer', requestOffer);

    // Determine who should create the first offer – we let the STUDENT start it
    if (user?.accountRole === 'STUDENT') {
      setTimeout(() => {
        createOffer();
        setReady(true);
      }, 500);
    }

    return () => {
      socket.off('webrtc:offer', handleOffer);
      socket.off('webrtc:answer', handleAnswer);
      socket.off('webrtc:ice-candidate', handleIceCandidate);
      socket.off('webrtc:request-offer', requestOffer);
      cleanup();
    };
  }, [socket, roomId, user]);

  const value = {
    localVideoRef,
    remoteVideoRef,
    ready,
    reset: cleanup,
  };

  return (
    <DualCamContext.Provider value={value}>
      {children}
    </DualCamContext.Provider>
  );
};

export const useDualCam = () => {
  const context = useContext(DualCamContext);
  if (!context) {
    throw new Error('useDualCam must be used within a DualCamProvider');
  }
  return context;
};
