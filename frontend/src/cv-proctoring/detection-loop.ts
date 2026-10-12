import type {
  FaceDetectionLoopOptions,
  FaceDetectionResult,
} from "./types.js";
import type { CvFaceDetector } from "./face-detector.js";

export class FaceDetectionLoop {
  private readonly detector: CvFaceDetector;
  private readonly video: HTMLVideoElement;
  private readonly intervalMs: number;
  private readonly onDetection:
    (result: FaceDetectionResult) => void;

  private timer: ReturnType<typeof setInterval> | undefined;
  private running = false;

  constructor(
    detector: CvFaceDetector,
    video: HTMLVideoElement,
    options: FaceDetectionLoopOptions
  ) {
    this.detector = detector;
    this.video = video;
    this.intervalMs =
      options.intervalMs ?? 500;
    this.onDetection =
      options.onDetection;
  }

  start(): void {
    if (this.running) {
      return;
    }

    this.running = true;

    this.detect();

    this.timer = setInterval(
      () => {
        this.detect();
      },
      this.intervalMs
    );
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

  private detect(): void {
    if (!this.running) {
      return;
    }

    if (
      this.video.readyState <
      HTMLMediaElement.HAVE_CURRENT_DATA
    ) {
      return;
    }

    if (
      this.video.videoWidth === 0 ||
      this.video.videoHeight === 0
    ) {
      return;
    }

    const timestampMs =
      performance.now();

    const result =
      this.detector.detect(
        this.video,
        timestampMs
      );

    this.onDetection(result);
  }
}