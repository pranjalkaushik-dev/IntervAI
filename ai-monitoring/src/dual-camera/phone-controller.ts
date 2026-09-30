import { PhoneDualCameraPeer } from "./phone-peer.js";
import { parseDualCameraJoinUrl } from "./join.js";
import type {
  DualCameraCallbacks,
  DualCameraConnectionState,
  DualCameraState,
} from "./types.js";

import type { DualCameraRtcConfig } from "./ice.js";

import type { DualCameraSignalingClient } from "./signaling-client.js";

import type {
  OfferMessage,
  IceCandidateMessage,
  LeaveSessionMessage,
} from "./signaling.js";

export interface PhoneDualCameraControllerOptions
  extends DualCameraCallbacks {
  joinUrl: string;
  signaling: DualCameraSignalingClient;
  rtcConfig?: DualCameraRtcConfig;
  onLocalStream?: (stream: MediaStream) => void;
}

export class PhoneDualCameraController {
  private readonly joinUrl: string;
  private readonly signaling: DualCameraSignalingClient;

  private readonly onViolation:
    | DualCameraCallbacks["onViolation"]
    | undefined;

  private readonly onConnectionStateChange:
    | DualCameraCallbacks["onConnectionStateChange"]
    | undefined;

  private readonly onLocalStream:
    | ((stream: MediaStream) => void)
    | undefined;

  private readonly rtcConfig:
    | DualCameraRtcConfig
    | undefined;

  private readonly sessionId: string;
  private readonly joinToken: string;

  private peer:
    | PhoneDualCameraPeer
    | undefined;

  private connectionState:
    DualCameraConnectionState = "DISCONNECTED";

  private localStream:
    | MediaStream
    | undefined;

  private unsubscribeOffer:
    | (() => void)
    | undefined;

  private unsubscribeIceCandidate:
    | (() => void)
    | undefined;

  private unsubscribeLeave:
    | (() => void)
    | undefined;

  constructor(
    options: PhoneDualCameraControllerOptions
  ) {
    this.joinUrl = options.joinUrl;
    this.signaling = options.signaling;

    this.onViolation =
      options.onViolation;

    this.onConnectionStateChange =
      options.onConnectionStateChange;

    this.onLocalStream =
      options.onLocalStream;

    this.rtcConfig =
      options.rtcConfig;

    const joinDetails =
      parseDualCameraJoinUrl(
        this.joinUrl
      );

    this.sessionId =
      joinDetails.sessionId;

    this.joinToken =
      joinDetails.joinToken;
  }

  async start(): Promise<void> {
    if (this.peer) {
      return;
    }

    await this.signaling.connect();

    this.registerSignalingHandlers();

    const peerOptions: {
      sessionId: string;
      joinToken: string;
      onSignal: NonNullable<
        ConstructorParameters<
          typeof PhoneDualCameraPeer
        >[0]["onSignal"]
      >;
      onViolation?: NonNullable<
        DualCameraCallbacks["onViolation"]
      >;
      onConnectionStateChange?: NonNullable<
        DualCameraCallbacks["onConnectionStateChange"]
      >;
      rtcConfig?: DualCameraRtcConfig;
    } = {
      sessionId:
        this.sessionId,

      joinToken:
        this.joinToken,

      onSignal: (message) => {
        switch (message.type) {
          case "JOIN_SESSION":
            this.signaling.sendJoinSession(
              message
            );
            break;

          case "ANSWER":
            this.signaling.sendAnswer(
              message
            );
            break;

          case "ICE_CANDIDATE":
            this.signaling.sendIceCandidate(
              message
            );
            break;
        }
      },
    };

    if (this.onViolation) {
      peerOptions.onViolation =
        this.onViolation;
    }

    if (this.onConnectionStateChange) {
      peerOptions.onConnectionStateChange =
        (role, state) => {
          this.setConnectionState(
            state
          );

          this.onConnectionStateChange?.(
            role,
            state
          );
        };
    }

    if (this.rtcConfig) {
      peerOptions.rtcConfig =
        this.rtcConfig;
    }

    const peer =
      new PhoneDualCameraPeer(
        peerOptions
      );

    this.peer = peer;

    peer.createConnection();

    this.localStream =
      await peer.startCamera();

    this.onLocalStream?.(
      this.localStream
    );

    this.signaling.sendJoinSession(
      peer.createJoinMessage()
    );
  }

  getSessionId(): string {
    return this.sessionId;
  }

  getConnectionState():
    DualCameraConnectionState {
    return this.connectionState;
  }

  getState(): DualCameraState {
    return {
      primary: {
        role: "PRIMARY",
        connectionState:
          "DISCONNECTED",
      },

      secondary: {
        role: "SECONDARY",
        connectionState:
          this.connectionState,
      },

      bothCamerasConnected: false,
    };
  }

  stop(): void {
    this.unsubscribeSignalingHandlers();

    this.peer?.close();

    this.peer = undefined;
    this.localStream = undefined;

    this.signaling.disconnect();

    this.setConnectionState(
      "DISCONNECTED"
    );
  }

  private registerSignalingHandlers(): void {
    this.unsubscribeOffer =
      this.signaling.onOffer(
        async (message) => {
          await this.handleOffer(
            message
          );
        }
      );

    this.unsubscribeIceCandidate =
      this.signaling.onIceCandidate(
        async (message) => {
          await this.handleIceCandidate(
            message
          );
        }
      );

    this.unsubscribeLeave =
      this.signaling.onLeave(
        (message) => {
          this.handleLeave(message);
        }
      );
  }

  private unsubscribeSignalingHandlers(): void {
    this.unsubscribeOffer?.();
    this.unsubscribeIceCandidate?.();
    this.unsubscribeLeave?.();

    this.unsubscribeOffer =
      undefined;

    this.unsubscribeIceCandidate =
      undefined;

    this.unsubscribeLeave =
      undefined;
  }

  private async handleOffer(
    message: OfferMessage
  ): Promise<void> {
    if (!this.peer) {
      return;
    }

    const answer =
      await this.peer.handleOffer(
        message
      );

    this.signaling.sendAnswer(
      answer
    );
  }

  private async handleIceCandidate(
    message: IceCandidateMessage
  ): Promise<void> {
    if (!this.peer) {
      return;
    }

    await this.peer.handleIceCandidate(
      message
    );
  }

  private handleLeave(
    message: LeaveSessionMessage
  ): void {
    if (
      message.sessionId !==
      this.sessionId
    ) {
      return;
    }

    this.setConnectionState(
      "DISCONNECTED"
    );
  }

  private setConnectionState(
    state: DualCameraConnectionState
  ): void {
    if (
      this.connectionState ===
      state
    ) {
      return;
    }

    this.connectionState = state;
  }
}
