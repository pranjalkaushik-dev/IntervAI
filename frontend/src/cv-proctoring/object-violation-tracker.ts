import type { CvViolation } from "./types.js";

export interface ObjectViolationTrackerOptions {
  persistenceMs?: number;
  onViolation?: (violation: CvViolation) => void;
}

export class ObjectViolationTracker {
  private readonly persistenceMs: number;

  private readonly onViolation:
    | ((violation: CvViolation) => void)
    | undefined;

  private startedAt: number | undefined;
  private reported = false;

  constructor(
    options: ObjectViolationTrackerOptions = {},
  ) {
    this.persistenceMs =
      options.persistenceMs ?? 2000;

    this.onViolation =
      options.onViolation;
  }

  update(
    occurredAt: string,
    objectType: string,
    confidence: number,
    nowMs: number = Date.now(),
  ): void {
    if (this.startedAt === undefined) {
      this.startedAt = nowMs;
    }

    if (this.reported) {
      return;
    }

    const duration =
      nowMs - this.startedAt;

    if (duration < this.persistenceMs) {
      return;
    }

    this.reported = true;

    const violation: CvViolation = {
      type: "PROHIBITED_OBJECT",
      occurredAt,
      metadata: {
        objectType,
        confidence,
      },
    };

    this.onViolation?.(violation);
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