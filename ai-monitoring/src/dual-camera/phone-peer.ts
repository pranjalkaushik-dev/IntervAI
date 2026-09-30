import type {
  CameraRole,
  DualCameraCallbacks,
  DualCameraConnectionState,
  DualCameraViolation,
} from "./types.js";

import type {
  AnswerMessage,
  IceCandidateMessage,
  JoinSessionMessage,
  OfferMessage,
} from "./signaling.js";

import type { DualCameraRtcConfig } from "./ice.js";

export interface PhoneDualCameraPeerOptions
  extends DualCameraCallbacks {
  sessionId: string;
  joinToken: string;
  onSignal?: (
    message:
      | JoinSessionMessage
      | AnswerMessage
      | IceCandidateMessage
  ) => void;
  rtcConfig?: DualCameraRtcConfig;
}

export class PhoneDualCameraPeer {
  private readonly sessionId: string;
  private readonly joinToken: string;
  private readonly onViolation?: DualCameraCallbacks["onViolation"];
  private readonly onConnectionStateChange?:
    DualCameraCallbacks["onConnectionStateChange"];
  private readonly onSignal?:
    PhoneDualCameraPeerOptions["onSignal"];
  private readonly rtcConfig:
    | DualCameraRtcConfig
    | undefined;

  private peerConnection:
    | RTCPeerConnection
    | undefined;

  private localStream:
    | MediaStream
    | undefined;

  private connectionState:
    DualCameraConnectionState = "DISCONNECTED";

  private cameraViolationReported = false;

  private readonly trackEndedHandlers =
    new Map<MediaStreamTrack, () => void>();

  constructor(
    options: PhoneDualCameraPeerOptions
  ) {
    this.sessionId = options.sessionId;
    this.joinToken = options.joinToken;
    this.onViolation = options.onViolation;
    this.onConnectionStateChange =
      options.onConnectionStateChange;
    this.onSignal = options.onSignal;
    this.rtcConfig = options.rtcConfig;
  }

  createConnection(): void {
    if (this.peerConnection) {
      return;
    }

    const peerConnection = this.rtcConfig
      ? new RTCPeerConnection({
          iceServers:
            this.rtcConfig.iceServers,
        })
      : new RTCPeerConnection();

    peerConnection.onconnectionstatechange =
      () => {
        this.setConnectionState(
          this.mapConnectionState(
            peerConnection.connectionState
          )
        );
      };

    peerConnection.onicecandidate = (
      event
    ) => {
      if (!event.candidate) {
        return;
      }

      this.onSignal?.({
        type: "ICE_CANDIDATE",
        sessionId: this.sessionId,
        candidate:
          event.candidate.toJSON(),
      });
    };

    this.peerConnection =
      peerConnection;
  }

  createJoinMessage(): JoinSessionMessage {
    return {
      type: "JOIN_SESSION",
      sessionId: this.sessionId,
      joinToken: this.joinToken,
    };
  }

  async startCamera(): Promise<MediaStream> {
    if (!this.peerConnection) {
      throw new Error(
        "WebRTC connection has not been created"
      );
    }

    if (this.localStream) {
      return this.localStream;
    }

    const stream =
      await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
        },
        audio: false,
      });

    this.localStream = stream;
    this.cameraViolationReported = false;

    for (const track of stream.getVideoTracks()) {
      const endedHandler = () => {
        this.handleVideoTrackEnded(track);
      };

      this.trackEndedHandlers.set(
        track,
        endedHandler
      );

      track.addEventListener(
        "ended",
        endedHandler
      );

      this.peerConnection.addTrack(
        track,
        stream
      );
    }

    return stream;
  }

  async handleOffer(
    message: OfferMessage
  ): Promise<AnswerMessage> {
    this.validateSession(message.sessionId);

    if (!this.peerConnection) {
      throw new Error(
        "WebRTC connection has not been created"
      );
    }

    await this.peerConnection.setRemoteDescription(
      new RTCSessionDescription(
        message.sdp
      )
    );

    const answer =
      await this.peerConnection.createAnswer();

    await this.peerConnection.setLocalDescription(
      answer
    );

    return {
      type: "ANSWER",
      sessionId: this.sessionId,
      sdp: {
        type: "answer",
        sdp: answer.sdp ?? "",
      },
    };
  }

  async handleIceCandidate(
    message: IceCandidateMessage
  ): Promise<void> {
    this.validateSession(message.sessionId);

    if (!this.peerConnection) {
      throw new Error(
        "WebRTC connection has not been created"
      );
    }

    await this.peerConnection.addIceCandidate(
      new RTCIceCandidate(
        message.candidate
      )
    );
  }

  getLocalStream():
    | MediaStream
    | undefined {
    return this.localStream;
  }

  getPeerConnection():
    | RTCPeerConnection
    | undefined {
    return this.peerConnection;
  }

  getConnectionState():
    DualCameraConnectionState {
    return this.connectionState;
  }

  stopCamera(): void {
    this.removeTrackListeners();

    if (this.localStream) {
      for (const track of this.localStream.getTracks()) {
        track.stop();
      }

      this.localStream = undefined;
    }

    this.cameraViolationReported = false;
  }

  close(): void {
    this.stopCamera();

    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection =
        undefined;
    }

    this.setConnectionState(
      "DISCONNECTED"
    );
  }

  private handleVideoTrackEnded(
    track: MediaStreamTrack
  ): void {
    this.trackEndedHandlers.delete(track);

    if (this.cameraViolationReported) {
      return;
    }

    this.cameraViolationReported = true;

    this.recordCameraViolation();
  }

  private recordCameraViolation(): void {
    const violation: DualCameraViolation = {
      role: "SECONDARY",
      type: "CAMERA_OFF",
      occurredAt:
        new Date().toISOString(),
    };

    this.onViolation?.(
      violation
    );
  }

  private removeTrackListeners(): void {
    for (const [
      track,
      handler,
    ] of this.trackEndedHandlers) {
      track.removeEventListener(
        "ended",
        handler
      );
    }

    this.trackEndedHandlers.clear();
  }

  private validateSession(
    sessionId: string
  ): void {
    if (
      sessionId !== this.sessionId
    ) {
      throw new Error(
        "Session ID does not match"
      );
    }
  }

  private setConnectionState(
    state: DualCameraConnectionState
  ): void {
    if (
      this.connectionState === state
    ) {
      return;
    }

    this.connectionState = state;

    this.onConnectionStateChange?.(
      "SECONDARY",
      state
    );
  }

  private mapConnectionState(
    state: RTCPeerConnectionState
  ): DualCameraConnectionState {
    switch (state) {
      case "connecting":
      case "new":
        return "CONNECTING";

      case "connected":
        return "CONNECTED";

      case "disconnected":
      case "failed":
      case "closed":
        return "DISCONNECTED";
    }
  }

  getCameraRole(): CameraRole {
    return "SECONDARY";
  }
}
