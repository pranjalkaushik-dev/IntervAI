import { beforeEach, describe, expect, it, vi } from "vitest";

import { BrowserActivityMonitor } from "../monitor.js";
import type { BrowserViolation } from "../types.js";

function createMockTrack(
  kind: "audio" | "video",
  enabled = true
): MediaStreamTrack {
  const listeners = new Map<string, EventListener[]>();

  return {
    kind,
    enabled,
    addEventListener: vi.fn((type: string, listener: EventListener) => {
      const existing = listeners.get(type) ?? [];
      existing.push(listener);
      listeners.set(type, existing);
    }),
    removeEventListener: vi.fn((type: string, listener: EventListener) => {
      const existing = listeners.get(type) ?? [];

      listeners.set(
        type,
        existing.filter((registered) => registered !== listener)
      );
    }),
    dispatchEvent: vi.fn((event: Event) => {
      for (const listener of listeners.get(event.type) ?? []) {
        listener(event);
      }

      return true;
    }),
  } as unknown as MediaStreamTrack;
}

function createMockStream(
  videoTracks: MediaStreamTrack[] = [],
  audioTracks: MediaStreamTrack[] = []
): MediaStream {
  return {
    getVideoTracks: () => videoTracks,
    getAudioTracks: () => audioTracks,
  } as unknown as MediaStream;
}

describe("BrowserActivityMonitor", () => {
  beforeEach(() => {
    vi.restoreAllMocks();

    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "visible",
    });

    Object.defineProperty(document, "fullscreenElement", {
      configurable: true,
      value: document.body,
    });
  });

  it("detects when the tab becomes hidden", () => {
    const onViolation = vi.fn<(violation: BrowserViolation) => void>();

    const monitor = new BrowserActivityMonitor({ onViolation });
    monitor.start();

    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "hidden",
    });

    document.dispatchEvent(new Event("visibilitychange"));

    expect(onViolation).toHaveBeenCalledTimes(1);
    expect(onViolation.mock.calls[0]?.[0].type).toBe("TAB_HIDDEN");

    monitor.stop();
  });

  it("detects fullscreen exit", () => {
    const onViolation = vi.fn<(violation: BrowserViolation) => void>();

    const monitor = new BrowserActivityMonitor({ onViolation });
    monitor.start();

    Object.defineProperty(document, "fullscreenElement", {
      configurable: true,
      value: null,
    });

    document.dispatchEvent(new Event("fullscreenchange"));

    expect(onViolation).toHaveBeenCalledTimes(1);
    expect(onViolation.mock.calls[0]?.[0].type).toBe("FULLSCREEN_EXIT");

    monitor.stop();
  });

  it("detects copy events", () => {
    const onViolation = vi.fn<(violation: BrowserViolation) => void>();

    const monitor = new BrowserActivityMonitor({ onViolation });
    monitor.start();

    document.dispatchEvent(new Event("copy"));

    expect(onViolation).toHaveBeenCalledTimes(1);
    expect(onViolation.mock.calls[0]?.[0].type).toBe("COPY");

    monitor.stop();
  });

  it("detects paste events", () => {
    const onViolation = vi.fn<(violation: BrowserViolation) => void>();

    const monitor = new BrowserActivityMonitor({ onViolation });
    monitor.start();

    document.dispatchEvent(new Event("paste"));

    expect(onViolation).toHaveBeenCalledTimes(1);
    expect(onViolation.mock.calls[0]?.[0].type).toBe("PASTE");

    monitor.stop();
  });

  it("detects when the camera track ends", () => {
    const onViolation = vi.fn<(violation: BrowserViolation) => void>();

    const cameraTrack = createMockTrack("video");
    const stream = createMockStream([cameraTrack]);

    const monitor = new BrowserActivityMonitor({ onViolation });

    monitor.start();
    monitor.startMediaMonitoring({ stream });

    cameraTrack.dispatchEvent(new Event("ended"));

    expect(onViolation).toHaveBeenCalledTimes(1);
    expect(onViolation.mock.calls[0]?.[0].type).toBe("CAMERA_OFF");

    monitor.stop();
  });

  it("detects when the microphone track ends", () => {
    const onViolation = vi.fn<(violation: BrowserViolation) => void>();

    const microphoneTrack = createMockTrack("audio");
    const stream = createMockStream([], [microphoneTrack]);

    const monitor = new BrowserActivityMonitor({ onViolation });

    monitor.start();
    monitor.startMediaMonitoring({ stream });

    microphoneTrack.dispatchEvent(new Event("ended"));

    expect(onViolation).toHaveBeenCalledTimes(1);
    expect(onViolation.mock.calls[0]?.[0].type).toBe("MIC_OFF");

    monitor.stop();
  });

  it("detects a disabled camera during media state check", () => {
    const onViolation = vi.fn<(violation: BrowserViolation) => void>();

    const cameraTrack = createMockTrack("video", false);
    const stream = createMockStream([cameraTrack]);

    const monitor = new BrowserActivityMonitor({ onViolation });

    monitor.start();
    monitor.startMediaMonitoring({ stream });
    monitor.checkMediaState();

    expect(onViolation).toHaveBeenCalledTimes(1);
    expect(onViolation.mock.calls[0]?.[0].type).toBe("CAMERA_OFF");

    monitor.stop();
  });

  it("detects a disabled microphone during media state check", () => {
    const onViolation = vi.fn<(violation: BrowserViolation) => void>();

    const microphoneTrack = createMockTrack("audio", false);
    const stream = createMockStream([], [microphoneTrack]);

    const monitor = new BrowserActivityMonitor({ onViolation });

    monitor.start();
    monitor.startMediaMonitoring({ stream });
    monitor.checkMediaState();

    expect(onViolation).toHaveBeenCalledTimes(1);
    expect(onViolation.mock.calls[0]?.[0].type).toBe("MIC_OFF");

    monitor.stop();
  });

  it("does not report enabled camera and microphone tracks", () => {
    const onViolation = vi.fn<(violation: BrowserViolation) => void>();

    const cameraTrack = createMockTrack("video", true);
    const microphoneTrack = createMockTrack("audio", true);

    const stream = createMockStream([cameraTrack], [microphoneTrack]);

    const monitor = new BrowserActivityMonitor({ onViolation });

    monitor.start();
    monitor.startMediaMonitoring({ stream });
    monitor.checkMediaState();

    expect(onViolation).not.toHaveBeenCalled();

    monitor.stop();
  });

  it("stops media monitoring correctly", () => {
    const onViolation = vi.fn<(violation: BrowserViolation) => void>();

    const cameraTrack = createMockTrack("video");
    const microphoneTrack = createMockTrack("audio");
    const stream = createMockStream([cameraTrack], [microphoneTrack]);

    const monitor = new BrowserActivityMonitor({ onViolation });

    monitor.start();
    monitor.startMediaMonitoring({ stream });
    monitor.stopMediaMonitoring();

    cameraTrack.dispatchEvent(new Event("ended"));
    microphoneTrack.dispatchEvent(new Event("ended"));

    expect(onViolation).not.toHaveBeenCalled();
  });

  it("does not detect events after the monitor is stopped", () => {
    const onViolation = vi.fn<(violation: BrowserViolation) => void>();

    const monitor = new BrowserActivityMonitor({ onViolation });
    monitor.start();
    monitor.stop();

    document.dispatchEvent(new Event("copy"));
    document.dispatchEvent(new Event("paste"));

    expect(onViolation).not.toHaveBeenCalled();
  });

  it("does not register duplicate listeners when started twice", () => {
    const onViolation = vi.fn<(violation: BrowserViolation) => void>();

    const monitor = new BrowserActivityMonitor({ onViolation });

    monitor.start();
    monitor.start();

    document.dispatchEvent(new Event("copy"));

    expect(onViolation).toHaveBeenCalledTimes(1);

    monitor.stop();
  });
});
