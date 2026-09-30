import { describe, expect, it, vi } from "vitest";
import { FaceDetectionLoop } from "../detection-loop.js";
import type { FaceDetectionResult } from "../types.js";

describe("Face Detection Loop", () => {
  it("starts and performs detection", () => {
    const detector = {
      detect: vi.fn((): FaceDetectionResult => ({
        status: "ONE_FACE",
        faceCount: 1,
        detectedAt: new Date().toISOString(),
      })),
    };

    const video = document.createElement("video");

    Object.defineProperty(video, "readyState", {
      value: HTMLMediaElement.HAVE_CURRENT_DATA,
    });

    Object.defineProperty(video, "videoWidth", {
      value: 640,
    });

    Object.defineProperty(video, "videoHeight", {
      value: 480,
    });

    const onDetection = vi.fn();

    const loop = new FaceDetectionLoop(
      detector as never,
      video,
      {
        intervalMs: 1000,
        onDetection,
      }
    );

    loop.start();

    expect(loop.isRunning()).toBe(true);
    expect(detector.detect).toHaveBeenCalledTimes(1);
    expect(onDetection).toHaveBeenCalledTimes(1);

    loop.stop();
  });

  it("does not detect when the video is not ready", () => {
    const detector = {
      detect: vi.fn(),
    };

    const video = document.createElement("video");

    Object.defineProperty(video, "readyState", {
      value: HTMLMediaElement.HAVE_METADATA,
    });

    Object.defineProperty(video, "videoWidth", {
      value: 640,
    });

    Object.defineProperty(video, "videoHeight", {
      value: 480,
    });

    const onDetection = vi.fn();

    const loop = new FaceDetectionLoop(
      detector as never,
      video,
      {
        intervalMs: 1000,
        onDetection,
      }
    );

    loop.start();

    expect(detector.detect).not.toHaveBeenCalled();
    expect(onDetection).not.toHaveBeenCalled();

    loop.stop();
  });

  it("does not detect when video dimensions are zero", () => {
    const detector = {
      detect: vi.fn(),
    };

    const video = document.createElement("video");

    Object.defineProperty(video, "readyState", {
      value: HTMLMediaElement.HAVE_CURRENT_DATA,
    });

    Object.defineProperty(video, "videoWidth", {
      value: 0,
    });

    Object.defineProperty(video, "videoHeight", {
      value: 0,
    });

    const onDetection = vi.fn();

    const loop = new FaceDetectionLoop(
      detector as never,
      video,
      {
        intervalMs: 1000,
        onDetection,
      }
    );

    loop.start();

    expect(detector.detect).not.toHaveBeenCalled();

    loop.stop();
  });

  it("stops the detection loop", () => {
    const detector = {
      detect: vi.fn((): FaceDetectionResult => ({
        status: "ONE_FACE",
        faceCount: 1,
        detectedAt: new Date().toISOString(),
      })),
    };

    const video = document.createElement("video");

    Object.defineProperty(video, "readyState", {
      value: HTMLMediaElement.HAVE_CURRENT_DATA,
    });

    Object.defineProperty(video, "videoWidth", {
      value: 640,
    });

    Object.defineProperty(video, "videoHeight", {
      value: 480,
    });

    const onDetection = vi.fn();

    const loop = new FaceDetectionLoop(
      detector as never,
      video,
      {
        intervalMs: 1000,
        onDetection,
      }
    );

    loop.start();

    expect(loop.isRunning()).toBe(true);

    loop.stop();

    expect(loop.isRunning()).toBe(false);
  });
});