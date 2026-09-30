import { beforeEach, describe, expect, it, vi } from "vitest";

import { LaptopDualCameraController } from "../laptop-controller.js";

import type { DualCameraSignalingClient } from "../signaling-client.js";

import type {
  LeaveSessionMessage,
} from "../signaling.js";

import type { DualCameraRtcConfig } from "../ice.js";

function createMockSignaling(): DualCameraSignalingClient {
  return {
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn(),

    sendJoinSession: vi.fn(),
    sendOffer: vi.fn(),
    sendAnswer: vi.fn(),
    sendIceCandidate: vi.fn(),

    onOffer: vi.fn().mockReturnValue(() => undefined),
    onAnswer: vi.fn().mockReturnValue(() => undefined),
    onIceCandidate: vi.fn().mockReturnValue(() => undefined),
    onSessionJoined: vi.fn().mockReturnValue(() => undefined),
    onLeave: vi.fn().mockReturnValue(() => undefined),
  };
}

describe("LaptopDualCameraController", () => {
  let connectionStateChange:
    | (() => void)
    | undefined;

  let lastRtcConfig:
    | RTCConfiguration
    | undefined;

  beforeEach(() => {
    vi.restoreAllMocks();

    connectionStateChange = undefined;
    lastRtcConfig = undefined;

    vi.stubGlobal(
      "RTCPeerConnection",
      class MockRTCPeerConnection {
        connectionState: RTCPeerConnectionState = "new";

        localDescription: RTCSessionDescription | null =
          null;

        onconnectionstatechange:
          | (() => void)
          | null = null;

        ontrack:
          | ((event: RTCTrackEvent) => void)
          | null = null;

        onicecandidate:
          | ((event: RTCPeerConnectionIceEvent) => void)
          | null = null;

        constructor(configuration?: RTCConfiguration) {
          lastRtcConfig = configuration;

          Object.defineProperty(
            this,
            "onconnectionstatechange",
            {
              set: (
                handler:
                  | (() => void)
                  | null
              ) => {
                if (handler) {
                  connectionStateChange =
                    handler;
                }
              },

              get: () =>
                connectionStateChange ??
                null,
            }
          );
        }

        async createOffer(): Promise<RTCSessionDescriptionInit> {
          return {
            type: "offer",
            sdp: "mock-offer-sdp",
          };
        }

        async setLocalDescription(
          description: RTCSessionDescriptionInit
        ): Promise<void> {
          this.localDescription =
            new RTCSessionDescription(
              description
            );
        }

        async setRemoteDescription(
          description: RTCSessionDescription
        ): Promise<void> {
          void description;
        }

        async addIceCandidate(
          candidate: RTCIceCandidate
        ): Promise<void> {
          void candidate;
        }

        close(): void {
          this.connectionState = "closed";
        }
      }
    );

    vi.stubGlobal(
      "RTCSessionDescription",
      class MockRTCSessionDescription {
        readonly type: RTCSdpType;
        readonly sdp: string;

        constructor(
          init: RTCSessionDescriptionInit
        ) {
          this.type =
            init.type ?? "offer";
          this.sdp = init.sdp ?? "";
        }

        toJSON(): RTCSessionDescriptionInit {
          return {
            type: this.type,
            sdp: this.sdp,
          };
        }
      }
    );

    vi.stubGlobal(
      "RTCIceCandidate",
      class MockRTCIceCandidate {
        readonly candidate: string;

        constructor(
          init: RTCIceCandidateInit
        ) {
          this.candidate =
            init.candidate ?? "";
        }
      }
    );
  });

  it("creates a dual-camera session", async () => {
    const signaling =
      createMockSignaling();

    const controller =
      new LaptopDualCameraController({
        joinBaseUrl:
          "https://example.com",
        signaling,
      });

    const session =
      await controller.start();

    expect(session.sessionId).toBeTruthy();
    expect(session.joinToken).toBeTruthy();

    expect(session.joinUrl).toContain(
      "/dual-camera/join"
    );

    expect(session.joinUrl).toContain(
      "sessionId="
    );

    expect(session.joinUrl).toContain(
      "token="
    );
  });

  it("connects to signaling when started", async () => {
    const signaling =
      createMockSignaling();

    const controller =
      new LaptopDualCameraController({
        joinBaseUrl:
          "https://example.com",
        signaling,
      });

    await controller.start();

    expect(
      signaling.connect
    ).toHaveBeenCalledOnce();
  });

  it("creates and sends a WebRTC offer", async () => {
    const signaling =
      createMockSignaling();

    const controller =
      new LaptopDualCameraController({
        joinBaseUrl:
          "https://example.com",
        signaling,
      });

    const session =
      await controller.start();

    await controller.createOffer();

    expect(
      signaling.sendOffer
    ).toHaveBeenCalledWith({
      type: "OFFER",
      sessionId:
        session.sessionId,
      sdp: {
        type: "offer",
        sdp: "mock-offer-sdp",
      },
    });
  });

  it("starts with primary connecting and secondary disconnected", async () => {
    const signaling =
      createMockSignaling();

    const controller =
      new LaptopDualCameraController({
        joinBaseUrl:
          "https://example.com",
        signaling,
      });

    await controller.start();

    const state =
      controller.getState();

    expect(
      state.primary.connectionState
    ).toBe("CONNECTING");

    expect(
      state.secondary.connectionState
    ).toBe("DISCONNECTED");

    expect(
      state.bothCamerasConnected
    ).toBe(false);
  });

  it("passes configured ICE servers to RTCPeerConnection", async () => {
    const signaling =
      createMockSignaling();

    const rtcConfig:
      DualCameraRtcConfig = {
        iceServers: [
          {
            urls:
              "stun:stun.example.com",
          },
          {
            urls:
              "turn:turn.example.com",
            username: "test-user",
            credential:
              "test-password",
          },
        ],
      };

    const controller =
      new LaptopDualCameraController({
        joinBaseUrl:
          "https://example.com",
        signaling,
        rtcConfig,
      });

    await controller.start();

    expect(lastRtcConfig).toEqual({
      iceServers:
        rtcConfig.iceServers,
    });
  });

  it("does not mark secondary connected merely because the phone joins signaling", async () => {
    const signaling =
      createMockSignaling();

    let joinedHandler:
      | ((message: {
          type: "JOIN_SESSION";
          sessionId: string;
          joinToken: string;
        }) => void)
      | undefined;

    vi.mocked(
      signaling.onSessionJoined
    ).mockImplementation(
      (handler) => {
        joinedHandler = handler;
        return () => undefined;
      }
    );

    const controller =
      new LaptopDualCameraController({
        joinBaseUrl:
          "https://example.com",
        signaling,
      });

    await controller.start();

    joinedHandler?.({
      type: "JOIN_SESSION",
      sessionId:
        "session-123",
      joinToken:
        "token-123",
    });

    expect(
      controller
        .getState()
        .secondary
        .connectionState
    ).toBe("DISCONNECTED");
  });

  it("marks secondary connected when WebRTC reaches connected state", async () => {
    const signaling =
      createMockSignaling();

    const controller =
      new LaptopDualCameraController({
        joinBaseUrl:
          "https://example.com",
        signaling,
      });

    await controller.start();

    const peerConnection =
      (
        controller as unknown as {
          peer: {
            getPeerConnection():
              | RTCPeerConnection
              | undefined;
          };
        }
      ).peer.getPeerConnection();

    expect(
      peerConnection
    ).toBeDefined();

    if (!peerConnection) {
      throw new Error(
        "Peer connection was not created"
      );
    }

    (
      peerConnection as unknown as {
        connectionState:
          RTCPeerConnectionState;
      }
    ).connectionState =
      "connected";

    connectionStateChange?.();

    expect(
      controller
        .getState()
        .secondary
        .connectionState
    ).toBe("CONNECTED");

    expect(
      controller
        .getState()
        .bothCamerasConnected
    ).toBe(false);
  });

  it("marks secondary disconnected when the phone leaves", async () => {
    const signaling =
      createMockSignaling();

    let leaveHandler:
      | ((message: LeaveSessionMessage) => void)
      | undefined;

    vi.mocked(
      signaling.onLeave
    ).mockImplementation(
      (handler) => {
        leaveHandler = handler;
        return () => undefined;
      }
    );

    const controller =
      new LaptopDualCameraController({
        joinBaseUrl:
          "https://example.com",
        signaling,
      });

    await controller.start();

    leaveHandler?.({
      type: "LEAVE_SESSION",
      sessionId:
        "session-123",
    });

    expect(
      controller
        .getState()
        .secondary
        .connectionState
    ).toBe("DISCONNECTED");
  });

  it("disconnects cleanly when stopped", async () => {
    const signaling =
      createMockSignaling();

    const controller =
      new LaptopDualCameraController({
        joinBaseUrl:
          "https://example.com",
        signaling,
      });

    await controller.start();

    controller.stop();

    expect(
      signaling.disconnect
    ).toHaveBeenCalledOnce();

    expect(
      controller
        .getState()
        .bothCamerasConnected
    ).toBe(false);
  });

  it("throws when createOffer is called before start", async () => {
    const signaling =
      createMockSignaling();

    const controller =
      new LaptopDualCameraController({
        joinBaseUrl:
          "https://example.com",
        signaling,
      });

    await expect(
      controller.createOffer()
    ).rejects.toThrow(
      "Dual-camera controller has not been started"
    );
  });
});
