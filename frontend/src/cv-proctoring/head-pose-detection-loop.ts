import type { FaceLandmarkResult } from "./face-landmarker.js";
import { estimateHeadPose } from "./head-pose-estimator.js";
import {
  classifyHeadPose,
  type HeadPoseResult,
} from "./head-pose.js";

export interface HeadPoseDetectionLoopOptions {
  intervalMs?: number;
  onDetection: (result: HeadPoseResult) => void;
}

export class HeadPoseDetectionLoop {
  private readonly video: HTMLVideoElement;
  private readonly intervalMs: number;
  private readonly onDetection: (
    result: HeadPoseResult,
  ) => void;
  private readonly detect: (
    video: HTMLVideoElement,
    timestampMs: number,
  ) => FaceLandmarkResult;

  private timer: ReturnType<typeof setInterval> | undefined;
  private running = false;

  constructor(
    video: HTMLVideoElement,
    detect: (
      video: HTMLVideoElement,
      timestampMs: number,
    ) => FaceLandmarkResult,
    options: HeadPoseDetectionLoopOptions,
  ) {
    this.video = video;
    this.detect = detect;
    this.intervalMs = options.intervalMs ?? 500;
    this.onDetection = options.onDetection;
  }

  start(): void {
    if (this.running) {
      return;
    }

    this.running = true;

    this.process();

    this.timer = setInterval(() => {
      this.process();
    }, this.intervalMs);
  }

  stop(): void {
    this.running = false;

    if (this.timer !== undefined) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  isRunning(): boolean {
    return this.running;
  }

  private process(): void {
    if (!this.running) {
      return;
    }

    if (
      this.video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA ||
      this.video.videoWidth === 0 ||
      this.video.videoHeight === 0
    ) {
      return;
    }

    const timestampMs = performance.now();

    const result = this.detect(
      this.video,
      timestampMs,
    );

    const firstFace = result.landmarks[0];

    if (!firstFace) {
      return;
    }

    const { yaw, pitch } =
      estimateHeadPose(firstFace);

    const status = classifyHeadPose(
      yaw,
      pitch,
    );

    this.onDetection({
      status,
      yaw,
      pitch,
      detectedAt: result.detectedAt,
    });
  }
}