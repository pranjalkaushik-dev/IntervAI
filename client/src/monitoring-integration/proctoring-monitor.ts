import type { CvViolation } from '../cv-proctoring/types.js';

export interface ProctoringMonitor {
  reportViolation(violation: CvViolation): void | Promise<void>;
}
