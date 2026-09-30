export type FaceDetectionStatus =
  | "NO_FACE"
  | "ONE_FACE"
  | "MULTIPLE_FACES";

export interface FaceDetectionResult {
  status: FaceDetectionStatus;
  faceCount: number;
  detectedAt: string;
}

export interface FaceDetectorOptions {
  minDetectionConfidence?: number;
  detectionIntervalMs?: number;
}

export interface FaceDetector {
  detect(
    video: HTMLVideoElement,
    timestampMs: number,
  ): FaceDetectionResult;
}

export interface FaceDetectionLoopOptions {
  intervalMs?: number;
  onDetection: (
    result: FaceDetectionResult,
  ) => void;
}

export type CvViolationType =
  | "CANDIDATE_ABSENT"
  | "MULTIPLE_PEOPLE"
  | "PROHIBITED_OBJECT"
  | "LOOKING_AWAY";

export interface CvViolation {
  type: CvViolationType;
  occurredAt: string;
  metadata?: {
    faceCount?: number;
    objectType?: string;
    confidence?: number;
    yaw?: number;
    pitch?: number;
  };
}

export interface CvProctoringCallbacks {
  onDetection?: (
    result: FaceDetectionResult,
  ) => void;

  onViolation?: (
    violation: CvViolation,
  ) => void;
}