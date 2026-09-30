import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { HeadPoseDetectionLoop } from "../head-pose-detection-loop.js";

function createVideo(): HTMLVideoElement {
  const video = document.createElement("video");

  Object.defineProperty(video, "readyState", {
    value: HTMLMediaElement.HAVE_CURRENT_DATA,
    configurable: true,
  });

  Object.defineProperty(video, "videoWidth", {
    value: 1280,
    configurable: true,
  });

  Object.defineProperty(video, "videoHeight", {
    value: 720,
    configurable: true,
  });

  return video;
}

function createLandmarks() {
  const landmarks = Array.from(
    { length: 300 },
    () => ({
      x: 0.5,
      y: 0.5,
      z: 0,
    }),
  );

  landmarks[1] = {
    x: 0.5,
    y: 0.6,
    z: 0,
  };

  landmarks[33] = {
    x: 0.4,
    y: 0.4,
    z: 0,
  };

  landmarks[263] = {
    x: 0.6,
    y: 0.4,
    z: 0,
  };

  landmarks[61] = {
    x: 0.4,
    y: 0.8,
    z: 0,
  };

  landmarks[291] = {
    x: 0.6,
    y: 0.8,
    z: 0,
  };

  return landmarks;
}

describe("Head Pose Detection Loop", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("detects head pose from face landmarks", () => {
    const video = createVideo();

    const detect = vi.fn(() => ({
      landmarks: [createLandmarks()],
      detectedAt: "2026-09-06T10:00:00.000Z",
    }));

    const onDetection = vi.fn();

    const loop = new HeadPoseDetectionLoop(
      video,
      detect,
      {
        intervalMs: 500,
        onDetection,
      },
    );

    loop.start();

    expect(detect).toHaveBeenCalledTimes(1);
    expect(onDetection).toHaveBeenCalledTimes(1);

    expect(onDetection).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "LOOKING_AT_SCREEN",
      }),
    );

    loop.stop();
  });

  it("does not process when video is not ready", () => {
    const video = document.createElement("video");

    Object.defineProperty(video, "readyState", {
      value: HTMLMediaElement.HAVE_METADATA,
      configurable: true,
    });

    Object.defineProperty(video, "videoWidth", {
      value: 1280,
      configurable: true,
    });

    Object.defineProperty(video, "videoHeight", {
      value: 720,
      configurable: true,
    });

    const detect = vi.fn();
    const onDetection = vi.fn();

    const loop = new HeadPoseDetectionLoop(
      video,
      detect,
      {
        onDetection,
      },
    );

    loop.start();

    expect(detect).not.toHaveBeenCalled();
    expect(onDetection).not.toHaveBeenCalled();

    loop.stop();
  });

  it("does not process when video dimensions are unavailable", () => {
    const video = document.createElement("video");

    Object.defineProperty(video, "readyState", {
      value: HTMLMediaElement.HAVE_CURRENT_DATA,
      configurable: true,
    });

    Object.defineProperty(video, "videoWidth", {
      value: 0,
      configurable: true,
    });

    Object.defineProperty(video, "videoHeight", {
      value: 0,
      configurable: true,
    });

    const detect = vi.fn();
    const onDetection = vi.fn();

    const loop = new HeadPoseDetectionLoop(
      video,
      detect,
      {
        onDetection,
      },
    );

    loop.start();

    expect(detect).not.toHaveBeenCalled();

    loop.stop();
  });

  it("stops processing after stop", () => {
    vi.useFakeTimers();

    const video = createVideo();

    const detect = vi.fn(() => ({
      landmarks: [createLandmarks()],
      detectedAt: "2026-09-06T10:00:00.000Z",
    }));

    const onDetection = vi.fn();

    const loop = new HeadPoseDetectionLoop(
      video,
      detect,
      {
        intervalMs: 500,
        onDetection,
      },
    );

    loop.start();

    expect(detect).toHaveBeenCalledTimes(1);

    loop.stop();

    vi.advanceTimersByTime(2000);

    expect(detect).toHaveBeenCalledTimes(1);
    expect(loop.isRunning()).toBe(false);
  });
});