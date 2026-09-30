import { describe, expect, it } from "vitest";

import {
  DualCameraPairingService,
} from "../pairing.js";

describe("DualCameraPairingService", () => {
  it("creates a session and QR code", async () => {
    const service = new DualCameraPairingService({
      joinBaseUrl: "https://example.com",
    });

    const result = await service.createPairing();

    expect(result.session.sessionId).toBeTruthy();
    expect(result.session.joinToken).toBeTruthy();

    expect(result.session.joinUrl).toContain(
      "/dual-camera/join"
    );

    expect(result.qrDataUrl).toMatch(
      /^data:image\/png;base64,/
    );
  });

  it("creates a QR code containing the session information", async () => {
    const service = new DualCameraPairingService({
      joinBaseUrl: "https://example.com",
    });

    const result = await service.createPairing();

    expect(result.qrDataUrl.length).toBeGreaterThan(100);
    expect(result.session.joinUrl).toContain(
      result.session.sessionId
    );
  });

  it("returns the active session", async () => {
    const service = new DualCameraPairingService({
      joinBaseUrl: "https://example.com",
    });

    expect(service.getSession()).toBeUndefined();

    const result = await service.createPairing();

    expect(service.getSession()).toEqual(
      result.session
    );
  });

  it("creates a new session for a new pairing", async () => {
    const service = new DualCameraPairingService({
      joinBaseUrl: "https://example.com",
    });

    const first = await service.createPairing();
    const second = await service.createPairing();

    expect(second.session.sessionId).not.toBe(
      first.session.sessionId
    );

    expect(second.session.joinToken).not.toBe(
      first.session.joinToken
    );
  });

  it("supports callbacks", async () => {
    const connectionStateChanges: string[] = [];

    const service = new DualCameraPairingService({
      joinBaseUrl: "https://example.com",
      callbacks: {
        onConnectionStateChange: (role, state) => {
          connectionStateChanges.push(
            `${role}:${state}`
          );
        },
      },
    });

    await service.createPairing();

    expect(connectionStateChanges).toContain(
      "PRIMARY:CONNECTING"
    );
  });
});
