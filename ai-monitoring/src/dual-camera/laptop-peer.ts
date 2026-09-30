import type {
  DualCameraCallbacks,
  DualCameraConnectionState,
} from "./types.js";

import type {
  AnswerMessage,
  IceCandidateMessage,
  OfferMessage,
} from "./signaling.js";

import type { DualCameraRtcConfig } from "./ice.js";

export interface LaptopPeerOptions {
  sessionId: string;
  callbacks?: DualCameraCallbacks;
  onRemoteStream?: (stream: MediaStream) => void;
  onSignal?: (
    message: OfferMessage | IceCandidateMessage
  ) => void;
  rtcConfig?: DualCameraRtcConfig;
}

export class LaptopDualCameraPeer {
  private readonly sessionId: string;
  private readonly callbacks: DualCameraCallbacks;
  private readonly onRemoteStream:
    | ((stream: MediaStream) => void)
    | undefined;
  private readonly onSignal:
    | ((message: OfferMessage | IceCandidateMessage) => void)
    | undefined;
  private readonly rtcConfig:
    | DualCameraRtcConfig
    | undefined;

  private peerConnection:
    | RTCPeerConnection
    | undefined;

  constructor(options: LaptopPeerOptions) {
    this.sessionId = options.sessionId;
    this.callbacks = options.callbacks ?? {};
    this.onRemoteStream = options.onRemoteStream;
    this.onSignal = options.onSignal;
    this.rtcConfig = options.rtcConfig;
  }

  createConnection(): RTCPeerConnection {
    if (this.peerConnection) {
      return this.peerConnection;
    }

    const peerConnection = this.rtcConfig
      ? new RTCPeerConnection({
          iceServers: this.rtcConfig.iceServers,
        })
      : new RTCPeerConnection();

    peerConnection.onconnectionstatechange = () => {
      this.callbacks.onConnectionStateChange?.(
        "SECONDARY",
        this.mapConnectionState(
          peerConnection.connectionState
        )
      );
    };

    peerConnection.ontrack = (
      event: RTCTrackEvent
    ) => {
      const stream = event.streams[0];

      if (stream) {
        this.onRemoteStream?.(stream);
      }
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
        candidate: event.candidate.toJSON(),
      });
    };

    this.peerConnection = peerConnection;

    this.callbacks.onConnectionStateChange?.(
      "SECONDARY",
      "CONNECTING"
    );

    return peerConnection;
  }

  async createOffer(): Promise<OfferMessage> {
    const peerConnection =
      this.getOrCreateConnection();

    const offer =
      await peerConnection.createOffer();

    await peerConnection.setLocalDescription(
      offer
    );

    if (!peerConnection.localDescription) {
      throw new Error(
        "Failed to create local WebRTC description"
      );
    }

    return {
      type: "OFFER",
      sessionId: this.sessionId,
      sdp: peerConnection.localDescription.toJSON(),
    };
  }

  async handleAnswer(
    message: AnswerMessage
  ): Promise<void> {
    if (
      message.sessionId !==
      this.sessionId
    ) {
      throw new Error(
        "Answer belongs to a different session"
      );
    }

    const peerConnection =
      this.getOrCreateConnection();

    await peerConnection.setRemoteDescription(
      new RTCSessionDescription(
        message.sdp
      )
    );
  }

  async handleIceCandidate(
    message: IceCandidateMessage
  ): Promise<void> {
    if (
      message.sessionId !==
      this.sessionId
    ) {
      throw new Error(
        "ICE candidate belongs to a different session"
      );
    }

    const peerConnection =
      this.getOrCreateConnection();

    await peerConnection.addIceCandidate(
      new RTCIceCandidate(
        message.candidate
      )
    );
  }

  getPeerConnection():
    | RTCPeerConnection
    | undefined {
    return this.peerConnection;
  }

  close(): void {
    if (!this.peerConnection) {
      return;
    }

    this.peerConnection.close();
    this.peerConnection = undefined;

    this.callbacks.onConnectionStateChange?.(
      "SECONDARY",
      "DISCONNECTED"
    );
  }

  private getOrCreateConnection():
    RTCPeerConnection {
    return (
      this.peerConnection ??
      this.createConnection()
    );
  }

  private mapConnectionState(
    state: RTCPeerConnectionState
  ): DualCameraConnectionState {
    switch (state) {
      case "new":
      case "connecting":
        return "CONNECTING";

      case "connected":
        return "CONNECTED";

      case "disconnected":
      case "failed":
      case "closed":
        return "DISCONNECTED";
    }
  }
}
