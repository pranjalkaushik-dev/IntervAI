import type {
  CvViolation,
  CvViolationType,
} from "./types.js";

export interface ViolationTrackerOptions {
  persistenceMs?: number;
  onViolation?: (
    violation: CvViolation
  ) => void;
}

export class CvViolationTracker {
  private readonly persistenceMs: number;

  private readonly onViolation:
    | ((violation: CvViolation) => void)
    | undefined;

  private readonly startedAt =
    new Map<CvViolationType, number>();

  private readonly reported =
    new Set<CvViolationType>();

  constructor(
    options: ViolationTrackerOptions = {}
  ) {
    this.persistenceMs =
      options.persistenceMs ?? 2000;

    this.onViolation =
      options.onViolation;
  }

  update(
    type: CvViolationType,
    occurredAt: string,
    faceCount: number,
    nowMs: number = Date.now()
  ): void {
    if (!this.startedAt.has(type)) {
      this.startedAt.set(
        type,
        nowMs
      );
    }

    if (
      this.reported.has(type)
    ) {
      return;
    }

    const start =
      this.startedAt.get(type);

    if (start === undefined) {
      return;
    }

    const duration =
      nowMs - start;

    if (
      duration < this.persistenceMs
    ) {
      return;
    }

    this.reported.add(type);

    const violation: CvViolation = {
      type,
      occurredAt,
      metadata: {
        faceCount,
      },
    };

    this.onViolation?.(
      violation
    );
  }

  clear(
    type: CvViolationType
  ): void {
    this.startedAt.delete(type);
    this.reported.delete(type);
  }

  clearAll(): void {
    this.startedAt.clear();
    this.reported.clear();
  }

  isActive(
    type: CvViolationType
  ): boolean {
    return this.startedAt.has(type);
  }

  isReported(
    type: CvViolationType
  ): boolean {
    return this.reported.has(type);
  }
}