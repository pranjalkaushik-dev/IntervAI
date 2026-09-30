import { describe, expect, it } from "vitest";
import { estimateHeadPose } from "../head-pose-estimator.js";

function createLandmarks(): Array<{
  x: number;
  y: number;
  z: number;
}> {
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

describe("Head Pose Estimator", () => {
  it("returns neutral orientation for a centered face", () => {
    const landmarks = createLandmarks();

    const result = estimateHeadPose(landmarks);

    expect(result.yaw).toBeCloseTo(0);
  });

  it("returns zero orientation when landmarks are missing", () => {
    const result = estimateHeadPose([]);

    expect(result).toEqual({
      yaw: 0,
      pitch: 0,
    });
  });

  it("handles insufficient landmark data", () => {
    const result = estimateHeadPose(
      Array.from({ length: 10 }, () => ({
        x: 0.5,
        y: 0.5,
        z: 0,
      })),
    );

    expect(result).toEqual({
      yaw: 0,
      pitch: 0,
    });
  });
});