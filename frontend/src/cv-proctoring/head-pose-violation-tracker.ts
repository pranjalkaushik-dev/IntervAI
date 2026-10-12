import type { CvViolation } from "./types.js";

export interface HeadPoseViolationTrackerOptions {
  persistenceMs?: number;
  onViolation?: (violation: CvViolation) => void;
}

export class HeadPoseViolationTracker {
  private readonly persistenceMs: number;
  private readonly onViolation:
    ((violation: CvViolation) => void) | undefined;

  private startedAt: number | undefined;
  private reported = false;

  constructor(
    options: HeadPoseViolationTrackerOptions = {},
  ) {
    this.persistenceMs = options.persistenceMs ?? 2000;
    this.onViolation = options.onViolation;
  }

  update(
    occurredAt: string,
    yaw: number,
    pitch: number,
    nowMs = Date.now(),
  ): void {
    if (this.startedAt === undefined) {
      this.startedAt = nowMs;
    }

    if (this.reported) {
      return;
    }

    if (nowMs - this.startedAt < this.persistenceMs) {
      return;
    }

    this.reported = true;

    this.onViolation?.({
      type: "LOOKING_AWAY",
      occurredAt,
      metadata: {
        yaw,
        pitch,
      },
    });
  }

  clear(): void {
    this.startedAt = undefined;
    this.reported = false;
  }

  isActive(): boolean {
    return this.startedAt !== undefined;
  }

  isReported(): boolean {
    return this.reported;
  }
}