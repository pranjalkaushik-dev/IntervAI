import { describe, expect, it, beforeEach, vi } from "vitest";
import { CvCamera } from "../camera.js";

describe("CV Camera", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("starts the camera and returns a media stream", async () => {
    const track = {
      stop: vi.fn(),
      readyState: "live",
    };

    const stream = {
      getTracks: vi.fn(() => [track]),
      getVideoTracks: vi.fn(() => [track]),
    } as unknown as MediaStream;

    vi.stubGlobal("navigator", {
      mediaDevices: {
        getUserMedia: vi.fn().mockResolvedValue(stream),
      },
    });

    const camera = new CvCamera();

    const result = await camera.start();

    expect(result).toBe(stream);
    expect(
      navigator.mediaDevices.getUserMedia
    ).toHaveBeenCalledTimes(1);
  });

  it("does not request the camera twice", async () => {
    const track = {
      stop: vi.fn(),
      readyState: "live",
    };

    const stream = {
      getTracks: vi.fn(() => [track]),
      getVideoTracks: vi.fn(() => [track]),
    } as unknown as MediaStream;

    const getUserMedia = vi
      .fn()
      .mockResolvedValue(stream);

    vi.stubGlobal("navigator", {
      mediaDevices: {
        getUserMedia,
      },
    });

    const camera = new CvCamera();

    await camera.start();
    await camera.start();

    expect(getUserMedia).toHaveBeenCalledTimes(1);
  });

  it("attaches the stream to a video element", async () => {
    const stream = {
      getTracks: vi.fn(() => []),
      getVideoTracks: vi.fn(() => []),
    } as unknown as MediaStream;

    vi.stubGlobal("navigator", {
      mediaDevices: {
        getUserMedia: vi.fn().mockResolvedValue(stream),
      },
    });

    const camera = new CvCamera();

    await camera.start();

    const video = document.createElement("video");

    camera.attachToVideo(video);

    expect(video.srcObject).toBe(stream);
    expect(video.playsInline).toBe(true);
    expect(video.autoplay).toBe(true);
    expect(video.muted).toBe(true);
  });

  it("throws when attaching before the camera starts", () => {
    const camera = new CvCamera();
    const video = document.createElement("video");

    expect(() => {
      camera.attachToVideo(video);
    }).toThrow(
      "Camera has not been started"
    );
  });

  it("reports whether the camera is active", async () => {
    const liveTrack = {
      stop: vi.fn(),
      readyState: "live",
    };

    const stream = {
      getTracks: vi.fn(() => [liveTrack]),
      getVideoTracks: vi.fn(() => [liveTrack]),
    } as unknown as MediaStream;

    vi.stubGlobal("navigator", {
      mediaDevices: {
        getUserMedia: vi.fn().mockResolvedValue(stream),
      },
    });

    const camera = new CvCamera();

    expect(camera.isActive()).toBe(false);

    await camera.start();

    expect(camera.isActive()).toBe(true);
  });

  it("stops all camera tracks", async () => {
    const track1 = {
      stop: vi.fn(),
      readyState: "live",
    };

    const track2 = {
      stop: vi.fn(),
      readyState: "live",
    };

    const stream = {
      getTracks: vi.fn(() => [track1, track2]),
      getVideoTracks: vi.fn(() => [track1, track2]),
    } as unknown as MediaStream;

    vi.stubGlobal("navigator", {
      mediaDevices: {
        getUserMedia: vi.fn().mockResolvedValue(stream),
      },
    });

    const camera = new CvCamera();

    await camera.start();
    camera.stop();

    expect(track1.stop).toHaveBeenCalledTimes(1);
    expect(track2.stop).toHaveBeenCalledTimes(1);
    expect(camera.getStream()).toBeUndefined();
    expect(camera.isActive()).toBe(false);
  });
});