import {
  FaceDetector as MediaPipeFaceDetector,
  FilesetResolver,
} from "@mediapipe/tasks-vision";

import type {
  FaceDetectionResult,
  FaceDetectorOptions,
} from "./types.js";

const WASM_PATH =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm";

const MODEL_PATH =
  "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite";

export function classifyFaceCount(
  faceCount: number
): FaceDetectionResult["status"] {
  if (faceCount === 0) {
    return "NO_FACE";
  }

  if (faceCount === 1) {
    return "ONE_FACE";
  }

  return "MULTIPLE_FACES";
}

export class CvFaceDetector {
  private readonly detector:
    | MediaPipeFaceDetector
    | undefined;

  private constructor(
    detector: MediaPipeFaceDetector
  ) {
    this.detector = detector;
  }

  static async create(
    options: FaceDetectorOptions = {}
  ): Promise<CvFaceDetector> {
    const vision =
      await FilesetResolver.forVisionTasks(
        WASM_PATH
      );

    const detector =
      await MediaPipeFaceDetector.createFromOptions(
        vision,
        {
          baseOptions: {
            modelAssetPath: MODEL_PATH,
          },

          runningMode: "VIDEO",

          minDetectionConfidence:
            options.minDetectionConfidence ?? 0.5,
        }
      );

    return new CvFaceDetector(
      detector
    );
  }

  detect(
    video: HTMLVideoElement,
    timestampMs: number
  ): FaceDetectionResult {
    if (!this.detector) {
      throw new Error(
        "Face detector has not been initialized"
      );
    }

    const result =
      this.detector.detectForVideo(
        video,
        timestampMs
      );

    const faceCount =
      result.detections.length;

    const status =
      classifyFaceCount(faceCount);

    return {
      status,
      faceCount,
      detectedAt:
        new Date().toISOString(),
    };
  }

  close(): void {
    this.detector?.close();
  }
}