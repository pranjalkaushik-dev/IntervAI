import { describe, expect, it, vi } from "vitest";
import { HeadPoseViolationTracker } from "../head-pose-violation-tracker.js";

describe("Head Pose Violation Tracker", () => {
  it("does not report a brief looking-away event", () => {
    const onViolation = vi.fn();

    const tracker = new HeadPoseViolationTracker({
      persistenceMs: 2000,
      onViolation,
    });

    tracker.update(
      "2026-09-06T10:00:00.000Z",
      30,
      5,
      1000,
    );

    tracker.update(
      "2026-09-06T10:00:01.000Z",
      30,
      5,
      2000,
    );

    expect(onViolation).not.toHaveBeenCalled();
  });

  it("reports looking away after persistence threshold", () => {
    const onViolation = vi.fn();

    const tracker = new HeadPoseViolationTracker({
      persistenceMs: 2000,
      onViolation,
    });

    tracker.update(
      "2026-09-06T10:00:00.000Z",
      30,
      5,
      1000,
    );

    tracker.update(
      "2026-09-06T10:00:02.000Z",
      35,
      8,
      3000,
    );

    expect(onViolation).toHaveBeenCalledTimes(1);

    expect(onViolation).toHaveBeenCalledWith({
      type: "LOOKING_AWAY",
      occurredAt: "2026-09-06T10:00:02.000Z",
      metadata: {
        yaw: 35,
        pitch: 8,
      },
    });
  });

  it("reports only once while looking away continues", () => {
    const onViolation = vi.fn();

    const tracker = new HeadPoseViolationTracker({
      persistenceMs: 2000,
      onViolation,
    });

    tracker.update(
      "2026-09-06T10:00:00.000Z",
      30,
      5,
      1000,
    );

    tracker.update(
      "2026-09-06T10:00:02.000Z",
      30,
      5,
      3000,
    );

    tracker.update(
      "2026-09-06T10:00:03.000Z",
      40,
      10,
      4000,
    );

    expect(onViolation).toHaveBeenCalledTimes(1);
  });

  it("clears the violation state", () => {
    const tracker = new HeadPoseViolationTracker({
      persistenceMs: 2000,
    });

    tracker.update(
      "2026-09-06T10:00:00.000Z",
      30,
      5,
      1000,
    );

    expect(tracker.isActive()).toBe(true);
    expect(tracker.isReported()).toBe(false);

    tracker.update(
      "2026-09-06T10:00:02.000Z",
      30,
      5,
      3000,
    );

    expect(tracker.isReported()).toBe(true);

    tracker.clear();

    expect(tracker.isActive()).toBe(false);
    expect(tracker.isReported()).toBe(false);
  });

  it("can report another violation after being cleared", () => {
    const onViolation = vi.fn();

    const tracker = new HeadPoseViolationTracker({
      persistenceMs: 1000,
      onViolation,
    });

    tracker.update(
      "2026-09-06T10:00:00.000Z",
      30,
      5,
      1000,
    );

    tracker.update(
      "2026-09-06T10:00:01.000Z",
      30,
      5,
      2000,
    );

    tracker.clear();

    tracker.update(
      "2026-09-06T10:00:05.000Z",
      -30,
      5,
      5000,
    );

    tracker.update(
      "2026-09-06T10:00:06.000Z",
      -30,
      5,
      6000,
    );

    expect(onViolation).toHaveBeenCalledTimes(2);
  });
});