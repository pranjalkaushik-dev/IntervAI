import { describe, expect, it } from "vitest";
import {
  classifyHeadPose,
} from "../head-pose.js";

describe("Head Pose Detection", () => {
  it("detects a candidate looking at the screen", () => {
    expect(classifyHeadPose(0, 0)).toBe("LOOKING_AT_SCREEN");
  });

  it("allows small head movements", () => {
    expect(classifyHeadPose(15, 10)).toBe("LOOKING_AT_SCREEN");
  });

  it("detects looking left", () => {
    expect(classifyHeadPose(-30, 0)).toBe("LOOKING_AWAY");
  });

  it("detects looking right", () => {
    expect(classifyHeadPose(30, 0)).toBe("LOOKING_AWAY");
  });

  it("detects looking down", () => {
    expect(classifyHeadPose(0, 25)).toBe("LOOKING_AWAY");
  });

  it("detects looking up", () => {
    expect(classifyHeadPose(0, -25)).toBe("LOOKING_AWAY");
  });

  it("supports custom thresholds", () => {
    expect(
      classifyHeadPose(15, 10, {
        yawThreshold: 10,
        pitchThreshold: 10,
      }),
    ).toBe("LOOKING_AWAY");
  });
});