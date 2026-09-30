import { beforeEach, describe, expect, it, vi } from "vitest";

import { ProctoringSession } from "../session.js";
import type { BrowserViolation } from "../../browser-monitoring/types.js";

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

describe("ProctoringSession", () => {
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

  it("starts and stops the proctoring session", () => {
    const stream = createMockStream();

    const onSessionStarted = vi.fn();
    const onSessionStopped = vi.fn();

    const session = new ProctoringSession({
      stream,
      callbacks: {
        onSessionStarted,
        onSessionStopped,
      },
    });

    expect(session.getState().active).toBe(false);

    session.start();

    expect(session.getState().active).toBe(true);
    expect(onSessionStarted).toHaveBeenCalledTimes(1);

    session.stop();

    expect(session.getState().active).toBe(false);
    expect(onSessionStopped).toHaveBeenCalledTimes(1);
  });

  it("does not start the session twice", () => {
    const stream = createMockStream();
    const onSessionStarted = vi.fn();

    const session = new ProctoringSession({
      stream,
      callbacks: {
        onSessionStarted,
      },
    });

    session.start();
    session.start();

    expect(onSessionStarted).toHaveBeenCalledTimes(1);
    expect(session.getState().active).toBe(true);

    session.stop();
  });

  it("records a tab-hidden violation", () => {
    const stream = createMockStream();

    const onViolation = vi.fn<(violation: BrowserViolation) => void>();

    const session = new ProctoringSession({
      stream,
      callbacks: {
        onViolation,
      },
    });

    session.start();

    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "hidden",
    });

    document.dispatchEvent(new Event("visibilitychange"));

    expect(onViolation).toHaveBeenCalledTimes(1);
    expect(onViolation.mock.calls[0]?.[0].type).toBe("TAB_HIDDEN");
    expect(session.getViolations()).toHaveLength(1);

    session.stop();
  });

  it("records a fullscreen-exit violation", () => {
    const stream = createMockStream();

    const onViolation = vi.fn<(violation: BrowserViolation) => void>();

    const session = new ProctoringSession({
      stream,
      callbacks: {
        onViolation,
      },
    });

    session.start();

    Object.defineProperty(document, "fullscreenElement", {
      configurable: true,
      value: null,
    });

    document.dispatchEvent(new Event("fullscreenchange"));

    expect(onViolation).toHaveBeenCalledTimes(1);
    expect(onViolation.mock.calls[0]?.[0].type).toBe("FULLSCREEN_EXIT");

    session.stop();
  });

  it("records a copy violation", () => {
    const stream = createMockStream();

    const onViolation = vi.fn<(violation: BrowserViolation) => void>();

    const session = new ProctoringSession({
      stream,
      callbacks: {
        onViolation,
      },
    });

    session.start();

    document.dispatchEvent(new Event("copy"));

    expect(onViolation).toHaveBeenCalledTimes(1);
    expect(onViolation.mock.calls[0]?.[0].type).toBe("COPY");

    session.stop();
  });

  it("records a paste violation", () => {
    const stream = createMockStream();

    const onViolation = vi.fn<(violation: BrowserViolation) => void>();

    const session = new ProctoringSession({
      stream,
      callbacks: {
        onViolation,
      },
    });

    session.start();

    document.dispatchEvent(new Event("paste"));

    expect(onViolation).toHaveBeenCalledTimes(1);
    expect(onViolation.mock.calls[0]?.[0].type).toBe("PASTE");

    session.stop();
  });

  it("records a camera-off violation", () => {
    const cameraTrack = createMockTrack("video");
    const stream = createMockStream([cameraTrack]);

    const onViolation = vi.fn<(violation: BrowserViolation) => void>();

    const session = new ProctoringSession({
      stream,
      callbacks: {
        onViolation,
      },
    });

    session.start();

    cameraTrack.dispatchEvent(new Event("ended"));

    expect(onViolation).toHaveBeenCalledTimes(1);
    expect(onViolation.mock.calls[0]?.[0].type).toBe("CAMERA_OFF");

    session.stop();
  });

  it("records a microphone-off violation", () => {
    const microphoneTrack = createMockTrack("audio");
    const stream = createMockStream([], [microphoneTrack]);

    const onViolation = vi.fn<(violation: BrowserViolation) => void>();

    const session = new ProctoringSession({
      stream,
      callbacks: {
        onViolation,
      },
    });

    session.start();

    microphoneTrack.dispatchEvent(new Event("ended"));

    expect(onViolation).toHaveBeenCalledTimes(1);
    expect(onViolation.mock.calls[0]?.[0].type).toBe("MIC_OFF");

    session.stop();
  });

  it("detects disabled camera and microphone during a media state check", () => {
    const cameraTrack = createMockTrack("video", false);
    const microphoneTrack = createMockTrack("audio", false);

    const stream = createMockStream(
      [cameraTrack],
      [microphoneTrack]
    );

    const onViolation = vi.fn<(violation: BrowserViolation) => void>();

    const session = new ProctoringSession({
      stream,
      callbacks: {
        onViolation,
      },
    });

    session.start();
    session.checkMediaState();

    expect(onViolation).toHaveBeenCalledTimes(2);

    expect(onViolation.mock.calls[0]?.[0].type).toBe("CAMERA_OFF");
    expect(onViolation.mock.calls[1]?.[0].type).toBe("MIC_OFF");

    session.stop();
  });

  it("does not check media state when the session is inactive", () => {
    const cameraTrack = createMockTrack("video", false);
    const stream = createMockStream([cameraTrack]);

    const onViolation = vi.fn<(violation: BrowserViolation) => void>();

    const session = new ProctoringSession({
      stream,
      callbacks: {
        onViolation,
      },
    });

    session.checkMediaState();

    expect(onViolation).not.toHaveBeenCalled();
  });

  it("returns a defensive copy of violations", () => {
    const stream = createMockStream();

    const session = new ProctoringSession({
      stream,
    });

    session.start();

    document.dispatchEvent(new Event("copy"));

    const violations = session.getViolations();

    violations.length = 0;

    expect(session.getViolations()).toHaveLength(1);

    session.stop();
  });

  it("does not record browser violations after the session stops", () => {
    const stream = createMockStream();

    const onViolation = vi.fn<(violation: BrowserViolation) => void>();

    const session = new ProctoringSession({
      stream,
      callbacks: {
        onViolation,
      },
    });

    session.start();
    session.stop();

    document.dispatchEvent(new Event("copy"));
    document.dispatchEvent(new Event("paste"));

    expect(onViolation).not.toHaveBeenCalled();
  });
});
