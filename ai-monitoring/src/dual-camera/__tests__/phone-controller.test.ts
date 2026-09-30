import { beforeEach, describe, expect, it, vi } from "vitest";

import { PhoneDualCameraController } from "../phone-controller.js";

import type { DualCameraSignalingClient } from "../signaling-client.js";
import type { DualCameraRtcConfig } from "../ice.js";

interface MockTrack {
  kind: "video";
  enabled: boolean;
  readyState: "live" | "ended";
  stop: ReturnType<typeof vi.fn>;
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
  triggerEnded: () => void;
}

function createMockTrack(): MockTrack {
  let endedHandler:
    | (() => void)
    | undefined;

  const track: MockTrack = {
    kind: "video",
    enabled: true,
    readyState: "live",
    stop: vi.fn(() => {
      track.readyState = "ended";
    }),
    addEventListener: vi.fn(
      (event: string, handler: () => void) => {
        if (event === "ended") {
          endedHandler = handler;
        }
      }
    ),
    removeEventListener: vi.fn(
      (event: string, handler: () => void) => {
        if (
          event === "ended" &&
          endedHandler === handler
        ) {
          endedHandler = undefined;
        }
      }
    ),
    triggerEnded: () => {
      track.readyState = "ended";
      endedHandler?.();
    },
  };

  return track;
}

function createMockStream(track: MockTrack): MediaStream {
  return {
    getTracks: () => [track],
    getVideoTracks: () => [track],
    getAudioTracks: () => [],
  } as unknown as MediaStream;
}

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

describe("PhoneDualCameraController", () => {
  let lastRtcConfig:
    | RTCConfiguration
    | undefined;

  beforeEach(() => {
    lastRtcConfig = undefined;
    vi.restoreAllMocks();

    vi.stubGlobal(
      "RTCPeerConnection",
      class MockRTCPeerConnection {
        connectionState: RTCPeerConnectionState =
          "new";

        constructor(
          configuration?: RTCConfiguration
        ) {
          lastRtcConfig = configuration;
        }

        addTrack = vi.fn();

        async setRemoteDescription(): Promise<void> {}

        async createAnswer(): Promise<RTCSessionDescriptionInit> {
          return {
            type: "answer",
            sdp: "mock-answer-sdp",
          };
        }

        async setLocalDescription(): Promise<void> {}

        async addIceCandidate(): Promise<void> {}

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

        constructor(init: RTCSessionDescriptionInit) {
          this.type = init.type ?? "offer";
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

        constructor(init: RTCIceCandidateInit) {
          this.candidate = init.candidate ?? "";
        }
      }
    );
  });

  it("connects to signaling when started", async () => {
    const signaling = createMockSignaling();
    const track = createMockTrack();

    vi.stubGlobal("navigator", {
      mediaDevices: {
        getUserMedia: vi.fn().mockResolvedValue(
          createMockStream(track)
        ),
      },
    });

    const controller =
      new PhoneDualCameraController({
        joinUrl:
          "https://example.com/dual-camera/join" +
          "?sessionId=session-123&token=token-456",
        signaling,
      });

    await controller.start();

    expect(signaling.connect).toHaveBeenCalledOnce();
  });

  it("requests the phone rear camera", async () => {
    const signaling = createMockSignaling();
    const track = createMockTrack();

    const getUserMedia = vi.fn().mockResolvedValue(
      createMockStream(track)
    );

    vi.stubGlobal("navigator", {
      mediaDevices: {
        getUserMedia,
      },
    });

    const controller =
      new PhoneDualCameraController({
        joinUrl:
          "https://example.com/dual-camera/join" +
          "?sessionId=session-123&token=token-456",
        signaling,
      });

    await controller.start();

    expect(getUserMedia).toHaveBeenCalledWith({
      video: {
        facingMode: "environment",
      },
      audio: false,
    });
  });

  it("passes configured ICE servers to RTCPeerConnection", async () => {
    const signaling = createMockSignaling();
    const track = createMockTrack();

    vi.stubGlobal("navigator", {
      mediaDevices: {
        getUserMedia: vi.fn().mockResolvedValue(
          createMockStream(track)
        ),
      },
    });

    const rtcConfig: DualCameraRtcConfig = {
      iceServers: [
        {
          urls: "stun:stun.example.com",
        },
        {
          urls: "turn:turn.example.com",
          username: "test-user",
          credential: "test-password",
        },
      ],
    };

    const controller =
      new PhoneDualCameraController({
        joinUrl:
          "https://example.com/dual-camera/join" +
          "?sessionId=session-123&token=token-456",
        signaling,
        rtcConfig,
      });

    await controller.start();

    expect(lastRtcConfig).toEqual({
      iceServers: rtcConfig.iceServers,
    });
  });

  it("adds the phone camera track to WebRTC", async () => {
    const signaling = createMockSignaling();
    const track = createMockTrack();

    vi.stubGlobal("navigator", {
      mediaDevices: {
        getUserMedia: vi.fn().mockResolvedValue(
          createMockStream(track)
        ),
      },
    });

    const controller =
      new PhoneDualCameraController({
        joinUrl:
          "https://example.com/dual-camera/join" +
          "?sessionId=session-123&token=token-456",
        signaling,
      });

    await controller.start();

    const peer =
      (controller as unknown as {
        peer: {
          getPeerConnection(): RTCPeerConnection | undefined;
        };
      }).peer;

    const connection =
      peer.getPeerConnection();

    expect(connection).toBeDefined();

    expect(
      (
        connection as unknown as {
          addTrack: ReturnType<typeof vi.fn>;
        }
      ).addTrack
    ).toHaveBeenCalledWith(
      track,
      expect.anything()
    );
  });

  it("sends the join message after starting the camera", async () => {
    const signaling = createMockSignaling();
    const track = createMockTrack();

    vi.stubGlobal("navigator", {
      mediaDevices: {
        getUserMedia: vi.fn().mockResolvedValue(
          createMockStream(track)
        ),
      },
    });

    const controller =
      new PhoneDualCameraController({
        joinUrl:
          "https://example.com/dual-camera/join" +
          "?sessionId=session-123&token=token-456",
        signaling,
      });

    await controller.start();

    expect(
      signaling.sendJoinSession
    ).toHaveBeenCalledWith({
      type: "JOIN_SESSION",
      sessionId: "session-123",
      joinToken: "token-456",
    });
  });

  it("returns the session ID from the join URL", () => {
    const signaling = createMockSignaling();

    const controller =
      new PhoneDualCameraController({
        joinUrl:
          "https://example.com/dual-camera/join" +
          "?sessionId=session-123&token=token-456",
        signaling,
      });

    expect(controller.getSessionId()).toBe(
      "session-123"
    );
  });

  it("starts disconnected before WebRTC connection", () => {
    const signaling = createMockSignaling();

    const controller =
      new PhoneDualCameraController({
        joinUrl:
          "https://example.com/dual-camera/join" +
          "?sessionId=session-123&token=token-456",
        signaling,
      });

    expect(
      controller.getConnectionState()
    ).toBe("DISCONNECTED");
  });

  it("reports CAMERA_OFF when the phone camera track ends", async () => {
    const signaling = createMockSignaling();
    const track = createMockTrack();

    vi.stubGlobal("navigator", {
      mediaDevices: {
        getUserMedia: vi.fn().mockResolvedValue(
          createMockStream(track)
        ),
      },
    });

    const violations: Array<{
      role: string;
      type: string;
      occurredAt: string;
    }> = [];

    const controller =
      new PhoneDualCameraController({
        joinUrl:
          "https://example.com/dual-camera/join" +
          "?sessionId=session-123&token=token-456",
        signaling,
        onViolation: (violation) => {
          violations.push(violation);
        },
      });

    await controller.start();

    track.triggerEnded();

    expect(violations).toHaveLength(1);
    expect(violations[0]?.role).toBe(
      "SECONDARY"
    );
    expect(violations[0]?.type).toBe(
      "CAMERA_OFF"
    );
    expect(
      violations[0]?.occurredAt
    ).toBeTruthy();
  });

  it("removes the camera ended listener when stopping", async () => {
    const signaling = createMockSignaling();
    const track = createMockTrack();

    vi.stubGlobal("navigator", {
      mediaDevices: {
        getUserMedia: vi.fn().mockResolvedValue(
          createMockStream(track)
        ),
      },
    });

    const violations: unknown[] = [];

    const controller =
      new PhoneDualCameraController({
        joinUrl:
          "https://example.com/dual-camera/join" +
          "?sessionId=session-123&token=token-456",
        signaling,
        onViolation: (violation) => {
          violations.push(violation);
        },
      });

    await controller.start();

    controller.stop();

    track.triggerEnded();

    expect(violations).toHaveLength(0);
    expect(
      track.removeEventListener
    ).toHaveBeenCalled();
  });

  it("disconnects signaling when stopped", async () => {
    const signaling = createMockSignaling();
    const track = createMockTrack();

    vi.stubGlobal("navigator", {
      mediaDevices: {
        getUserMedia: vi.fn().mockResolvedValue(
          createMockStream(track)
        ),
      },
    });

    const controller =
      new PhoneDualCameraController({
        joinUrl:
          "https://example.com/dual-camera/join" +
          "?sessionId=session-123&token=token-456",
        signaling,
      });

    await controller.start();

    controller.stop();

    expect(
      signaling.disconnect
    ).toHaveBeenCalledOnce();

    expect(
      controller.getConnectionState()
    ).toBe("DISCONNECTED");
  });

  it("rejects a malformed join URL", () => {
    const signaling = createMockSignaling();

    expect(
      () =>
        new PhoneDualCameraController({
          joinUrl: "not-a-valid-url",
          signaling,
        })
    ).toThrow(
      "Invalid dual-camera join URL"
    );
  });
});
