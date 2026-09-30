import { CvCamera } from "./camera.js";
import { CvFaceDetector } from "./face-detector.js";
import { FaceDetectionLoop } from "./detection-loop.js";
import { CvObjectDetector } from "./object-detector.js";
import { ObjectDetectionLoop } from "./object-detection-loop.js";
import { detectProhibitedObjects } from "./object-rules.js";
import { CvViolationTracker } from "./violation-tracker.js";
import { ObjectViolationTracker } from "./object-violation-tracker.js";
import { CvFaceLandmarker } from "./face-landmarker.js";
import { HeadPoseDetectionLoop } from "./head-pose-detection-loop.js";
import { HeadPoseViolationTracker } from "./head-pose-violation-tracker.js";

import type {
  CvProctoringCallbacks,
  CvViolation,
  FaceDetectionResult,
} from "./types.js";

import type { ObjectDetectionResult } from "./object-detector.js";

import type { HeadPoseResult } from "./head-pose.js";

import type { ProctoringMonitor } from "../monitoring-integration/proctoring-monitor.js";

export interface CvProctoringControllerOptions {
  callbacks?: CvProctoringCallbacks;

  monitoring?: ProctoringMonitor;

  detectionIntervalMs?: number;

  minDetectionConfidence?: number;

  violationPersistenceMs?: number;

  objectDetectionConfidence?: number;

  maxObjectResults?: number;

  onHeadPoseDetection?: (
    result: HeadPoseResult,
  ) => void;
}

export class CvProctoringController {
  private readonly camera: CvCamera;

  private readonly callbacks: CvProctoringCallbacks;

  private readonly monitoring:
    | ProctoringMonitor
    | undefined;

  private readonly detectionIntervalMs: number;

  private readonly minDetectionConfidence:
    | number
    | undefined;

  private readonly violationPersistenceMs: number;

  private readonly objectDetectionConfidence:
    | number
    | undefined;

  private readonly maxObjectResults:
    | number
    | undefined;

  private readonly onHeadPoseDetection:
    | ((result: HeadPoseResult) => void)
    | undefined;

  private readonly violationTracker:
    CvViolationTracker;

  private readonly objectViolationTracker:
    ObjectViolationTracker;

  private readonly headPoseViolationTracker:
    HeadPoseViolationTracker;

  private faceDetector:
    CvFaceDetector | undefined;

  private objectDetector:
    CvObjectDetector | undefined;

  private faceLandmarker:
    CvFaceLandmarker | undefined;

  private faceLoop:
    FaceDetectionLoop | undefined;

  private objectLoop:
    ObjectDetectionLoop | undefined;

  private headPoseLoop:
    HeadPoseDetectionLoop | undefined;

  private video:
    HTMLVideoElement | undefined;

  private running = false;

  constructor(
    options: CvProctoringControllerOptions = {},
  ) {
    this.camera = new CvCamera();

    this.callbacks =
      options.callbacks ?? {};

    this.monitoring =
      options.monitoring;

    this.detectionIntervalMs =
      options.detectionIntervalMs ?? 500;

    this.minDetectionConfidence =
      options.minDetectionConfidence;

    this.violationPersistenceMs =
      options.violationPersistenceMs ?? 2000;

    this.objectDetectionConfidence =
      options.objectDetectionConfidence;

    this.maxObjectResults =
      options.maxObjectResults;

    this.onHeadPoseDetection =
      options.onHeadPoseDetection;

    this.violationTracker =
      new CvViolationTracker({
        persistenceMs:
          this.violationPersistenceMs,

        onViolation: (
          violation: CvViolation,
        ) => {
          this.callbacks.onViolation?.(
            violation,
          );

          this.monitoring?.reportViolation(
            violation,
          );
        },
      });

    this.objectViolationTracker =
      new ObjectViolationTracker({
        persistenceMs:
          this.violationPersistenceMs,

        onViolation: (
          violation: CvViolation,
        ) => {
          this.callbacks.onViolation?.(
            violation,
          );

          this.monitoring?.reportViolation(
            violation,
          );
        },
      });

    this.headPoseViolationTracker =
      new HeadPoseViolationTracker({
        persistenceMs:
          this.violationPersistenceMs,

        onViolation: (
          violation: CvViolation,
        ) => {
          this.callbacks.onViolation?.(
            violation,
          );

          this.monitoring?.reportViolation(
            violation,
          );
        },
      });
  }

  async start(
    video: HTMLVideoElement,
  ): Promise<void> {
    if (this.running) {
      return;
    }

    this.video = video;

    await this.camera.start();

    this.camera.attachToVideo(video);

    /*
     * Face detector options.
     */
    const faceDetectorOptions =
      this.minDetectionConfidence !==
      undefined
        ? {
            minDetectionConfidence:
              this.minDetectionConfidence,
          }
        : {};

    /*
     * Create face detector.
     */
    this.faceDetector =
      await CvFaceDetector.create(
        faceDetectorOptions,
      );

    /*
     * Face landmarker options.
     */
    const faceLandmarkerOptions: {
      minFaceDetectionConfidence?: number;

      minFacePresenceConfidence?: number;

      minTrackingConfidence?: number;
    } = {};

    if (
      this.minDetectionConfidence !==
      undefined
    ) {
      faceLandmarkerOptions.minFaceDetectionConfidence =
        this.minDetectionConfidence;

      faceLandmarkerOptions.minFacePresenceConfidence =
        this.minDetectionConfidence;

      faceLandmarkerOptions.minTrackingConfidence =
        this.minDetectionConfidence;
    }

    /*
     * Create face landmarker.
     */
    this.faceLandmarker =
      await CvFaceLandmarker.create(
        faceLandmarkerOptions,
      );

    /*
     * Object detector options.
     */
    const objectDetectorOptions: {
      minDetectionConfidence?: number;

      maxResults?: number;
    } = {};

    if (
      this.objectDetectionConfidence !==
      undefined
    ) {
      objectDetectorOptions.minDetectionConfidence =
        this.objectDetectionConfidence;
    }

    if (
      this.maxObjectResults !==
      undefined
    ) {
      objectDetectorOptions.maxResults =
        this.maxObjectResults;
    }

    /*
     * Create object detector.
     */
    this.objectDetector =
      await CvObjectDetector.create(
        objectDetectorOptions,
      );

    /*
     * Face detection loop.
     */
    this.faceLoop =
      new FaceDetectionLoop(
        this.faceDetector,
        video,
        {
          intervalMs:
            this.detectionIntervalMs,

          onDetection: (
            result: FaceDetectionResult,
          ) => {
            this.handleDetection(
              result,
            );
          },
        },
      );

    /*
     * Object detection loop.
     */
    this.objectLoop =
      new ObjectDetectionLoop(
        this.objectDetector,
        video,
        {
          intervalMs:
            this.detectionIntervalMs,

          onDetection: (
            result: ObjectDetectionResult,
          ) => {
            this.handleObjectDetection(
              result,
            );
          },
        },
      );

    /*
     * Head-pose detection loop.
     */
    const faceLandmarker =
      this.faceLandmarker;

    if (
      faceLandmarker === undefined
    ) {
      throw new Error(
        "Face landmarker was not initialized.",
      );
    }

    this.headPoseLoop =
      new HeadPoseDetectionLoop(
        video,

        (
          landmarkerVideo:
            HTMLVideoElement,
          timestampMs: number,
        ) =>
          faceLandmarker.detect(
            landmarkerVideo,
            timestampMs,
          ),

        {
          intervalMs:
            this.detectionIntervalMs,

          onDetection: (
            result: HeadPoseResult,
          ) => {
            this.handleHeadPoseDetection(
              result,
            );
          },
        },
      );

    this.running = true;

    this.faceLoop.start();

    this.objectLoop.start();

    this.headPoseLoop.start();
  }

  stop(): void {
    this.running = false;

    /*
     * Stop detection loops.
     */
    this.faceLoop?.stop();

    this.objectLoop?.stop();

    this.headPoseLoop?.stop();

    this.faceLoop = undefined;

    this.objectLoop = undefined;

    this.headPoseLoop = undefined;

    /*
     * Close MediaPipe detectors.
     */
    this.faceDetector?.close();

    this.objectDetector?.close();

    this.faceLandmarker?.close();

    this.faceDetector = undefined;

    this.objectDetector = undefined;

    this.faceLandmarker = undefined;

    /*
     * Clear violation trackers.
     */
    this.violationTracker.clearAll();

    this.objectViolationTracker.clear();

    this.headPoseViolationTracker.clear();

    /*
     * Stop camera.
     */
    this.camera.stop();

    if (this.video) {
      this.video.srcObject = null;
    }

    this.video = undefined;
  }

  isRunning(): boolean {
    return this.running;
  }

  isCameraActive(): boolean {
    return this.camera.isActive();
  }

  processDetection(
    result: FaceDetectionResult,
  ): void {
    this.handleDetection(result);
  }

  processObjectDetection(
    result: ObjectDetectionResult,
  ): void {
    this.handleObjectDetection(
      result,
    );
  }

  processHeadPoseDetection(
    result: HeadPoseResult,
  ): void {
    this.handleHeadPoseDetection(
      result,
    );
  }

  private handleDetection(
    result: FaceDetectionResult,
  ): void {
    this.callbacks.onDetection?.(
      result,
    );

    if (
      result.status === "NO_FACE"
    ) {
      this.violationTracker.clear(
        "MULTIPLE_PEOPLE",
      );

      this.violationTracker.update(
        "CANDIDATE_ABSENT",

        result.detectedAt,

        result.faceCount,
      );

      return;
    }

    if (
      result.status ===
      "MULTIPLE_FACES"
    ) {
      this.violationTracker.clear(
        "CANDIDATE_ABSENT",
      );

      this.violationTracker.update(
        "MULTIPLE_PEOPLE",

        result.detectedAt,

        result.faceCount,
      );

      return;
    }

    /*
     * Exactly one face detected.
     */
    this.violationTracker.clear(
      "CANDIDATE_ABSENT",
    );

    this.violationTracker.clear(
      "MULTIPLE_PEOPLE",
    );
  }

  private handleObjectDetection(
    result: ObjectDetectionResult,
  ): void {
    const prohibitedObjects =
      detectProhibitedObjects(
        result.objects,
      );

    const object =
      prohibitedObjects[0];

    if (!object) {
      this.objectViolationTracker.clear();

      return;
    }

    this.objectViolationTracker.update(
      result.detectedAt,

      object.label,

      object.score,
    );
  }

  private handleHeadPoseDetection(
    result: HeadPoseResult,
  ): void {
    /*
     * Send the current head-pose
     * result to the UI.
     */
    this.onHeadPoseDetection?.(
      result,
    );

    /*
     * Track persistent looking-away.
     */
    if (
      result.status ===
      "LOOKING_AWAY"
    ) {
      this.headPoseViolationTracker.update(
        result.detectedAt,

        result.yaw,

        result.pitch,
      );

      return;
    }

    /*
     * Candidate is looking back
     * at the screen.
     */
    this.headPoseViolationTracker.clear();
  }
}