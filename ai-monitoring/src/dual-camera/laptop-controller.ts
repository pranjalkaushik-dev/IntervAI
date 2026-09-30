import { LaptopDualCameraPeer } from "./laptop-peer.js";
import { DualCameraSessionManager } from "./session.js";

import type {
  DualCameraCallbacks,
  DualCameraState,
  DualCameraSession,
} from "./types.js";

import type { DualCameraRtcConfig } from "./ice.js";

import type {
  AnswerMessage,
  IceCandidateMessage,
  LeaveSessionMessage,
} from "./signaling.js";

import type { DualCameraSignalingClient } from "./signaling-client.js";

export interface LaptopDualCameraControllerOptions
  extends DualCameraCallbacks {
  signaling: DualCameraSignalingClient;
  joinBaseUrl: string;
  rtcConfig?: DualCameraRtcConfig;
  onRemoteStream?: (stream: MediaStream) => void;
}

export class LaptopDualCameraController {
  private readonly signaling: DualCameraSignalingClient;
  private readonly sessionManager: DualCameraSessionManager;
  private readonly rtcConfig:
    | DualCameraRtcConfig
    | undefined;

  private readonly callbacks: DualCameraCallbacks;
  private readonly onRemoteStream:
    | ((stream: MediaStream) => void)
    | undefined;

  private peer:
    | LaptopDualCameraPeer
    | undefined;

  private unsubscribeAnswer:
    | (() => void)
    | undefined;

  private unsubscribeIceCandidate:
    | (() => void)
    | undefined;

  private unsubscribeSessionJoined:
    | (() => void)
    | undefined;

  private unsubscribeLeave:
    | (() => void)
    | undefined;

  constructor(
    options: LaptopDualCameraControllerOptions
  ) {
    this.signaling = options.signaling;
    this.rtcConfig = options.rtcConfig;
    this.onRemoteStream =
      options.onRemoteStream;

    this.callbacks = {
      ...(options.onViolation
        ? {
            onViolation:
              options.onViolation,
          }
        : {}),
      ...(options.onConnectionStateChange
        ? {
            onConnectionStateChange:
              options.onConnectionStateChange,
          }
        : {}),
    };

    this.sessionManager =
      new DualCameraSessionManager({
        joinBaseUrl:
          options.joinBaseUrl,
      });
  }

  async start(): Promise<DualCameraSession> {
    if (this.peer) {
      throw new Error(
        "Dual-camera session is already active"
      );
    }

    const session =
      this.sessionManager.createSession();

    /*
     * The laptop side is the primary camera/session
     * controller. At this point it is connecting,
     * not connected yet.
     */
    this.callbacks
      .onConnectionStateChange?.(
        "PRIMARY",
        "CONNECTING"
      );

    await this.signaling.connect();

    this.registerSignalingHandlers();

    const peerOptions: {
      sessionId: string;
      callbacks: DualCameraCallbacks;
      onSignal: NonNullable<
        ConstructorParameters<
          typeof LaptopDualCameraPeer
        >[0]["onSignal"]
      >;
      onRemoteStream?: (
        stream: MediaStream
      ) => void;
      rtcConfig?: DualCameraRtcConfig;
    } = {
      sessionId: session.sessionId,

      callbacks: {
        ...this.callbacks,

        onConnectionStateChange: (
          role,
          state
        ) => {
          this.handlePeerConnectionState(
            role,
            state
          );

          this.callbacks
            .onConnectionStateChange?.(
              role,
              state
            );
        },
      },

      onSignal: (message) => {
        switch (message.type) {
          case "OFFER":
            this.signaling.sendOffer(
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

    if (this.onRemoteStream) {
      peerOptions.onRemoteStream =
        this.onRemoteStream;
    }

    if (this.rtcConfig) {
      peerOptions.rtcConfig =
        this.rtcConfig;
    }

    this.peer =
      new LaptopDualCameraPeer(
        peerOptions
      );

    this.peer.createConnection();

    /*
     * createConnection() represents the secondary
     * WebRTC connection, so the primary camera must
     * not be marked connected here.
     *
     * The actual primary camera is managed separately
     * by the browser/proctoring layer.
     */

    return session;
  }

  async createOffer(): Promise<
    ReturnType<LaptopDualCameraPeer["createOffer"]>
  > {
    if (!this.peer) {
      throw new Error(
        "Dual-camera controller has not been started"
      );
    }

    const offer =
      await this.peer.createOffer();

    this.signaling.sendOffer(
      offer
    );

    return offer;
  }

  getState(): DualCameraState {
    return this.sessionManager.getState();
  }

  getSession():
    | DualCameraSession
    | undefined {
    return this.sessionManager.getSession();
  }

  stop(): void {
    this.unsubscribeSignalingHandlers();

    this.peer?.close();
    this.peer = undefined;

    this.signaling.disconnect();

    this.sessionManager.reset();

    this.callbacks
      .onConnectionStateChange?.(
        "PRIMARY",
        "DISCONNECTED"
      );
  }

  private registerSignalingHandlers(): void {
    this.unsubscribeAnswer =
      this.signaling.onAnswer(
        async (message) => {
          await this.handleAnswer(
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

    this.unsubscribeSessionJoined =
      this.signaling.onSessionJoined(
        () => {
          /*
           * Joining signaling does not mean that
           * WebRTC media is connected.
           *
           * The secondary camera becomes CONNECTED
           * only when RTCPeerConnection reaches
           * "connected".
           */
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
    this.unsubscribeAnswer?.();
    this.unsubscribeIceCandidate?.();
    this.unsubscribeSessionJoined?.();
    this.unsubscribeLeave?.();

    this.unsubscribeAnswer =
      undefined;

    this.unsubscribeIceCandidate =
      undefined;

    this.unsubscribeSessionJoined =
      undefined;

    this.unsubscribeLeave =
      undefined;
  }

  private async handleAnswer(
    message: AnswerMessage
  ): Promise<void> {
    if (!this.peer) {
      return;
    }

    await this.peer.handleAnswer(
      message
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

  private handlePeerConnectionState(
    role:
      | "PRIMARY"
      | "SECONDARY",
    state:
      | "DISCONNECTED"
      | "CONNECTING"
      | "CONNECTED"
  ): void {
    if (role !== "SECONDARY") {
      return;
    }

    switch (state) {
      case "CONNECTING":
        // The session manager starts the secondary
        // camera as DISCONNECTED. Signaling/WebRTC
        // negotiation does not mean the phone camera
        // is connected yet.
        break;

      case "CONNECTED":
        this.sessionManager
          .setSecondaryConnected();
        break;

      case "DISCONNECTED":
        this.sessionManager
          .setSecondaryDisconnected();
        break;
    }
  }

  private handleLeave(
    message: LeaveSessionMessage
  ): void {
    const session =
      this.sessionManager.getSession();

    if (!session) {
      return;
    }

    if (
      message.sessionId !==
      session.sessionId
    ) {
      return;
    }

    this.sessionManager
      .setSecondaryDisconnected();
  }
}
