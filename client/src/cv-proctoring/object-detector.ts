import {
  FilesetResolver,
  ObjectDetector as MediaPipeObjectDetector,
} from "@mediapipe/tasks-vision";

export interface DetectedObject {
  label: string;
  score: number;
}

export interface ObjectDetectionResult {
  objects: DetectedObject[];
  detectedAt: string;
}

export interface ObjectDetectorOptions {
  minDetectionConfidence?: number;
  maxResults?: number;
}

const WASM_PATH =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm";

const MODEL_PATH =
  "https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/int8/1/efficientdet_lite0.tflite";

export class CvObjectDetector {
  private constructor(
    private readonly detector: MediaPipeObjectDetector,
  ) {}

  static async create(
    options: ObjectDetectorOptions = {},
  ): Promise<CvObjectDetector> {
    const vision = await FilesetResolver.forVisionTasks(WASM_PATH);

    const detector = await MediaPipeObjectDetector.createFromOptions(
      vision,
      {
        baseOptions: {
          modelAssetPath: MODEL_PATH,
        },
        runningMode: "VIDEO",
        scoreThreshold: options.minDetectionConfidence ?? 0.5,
        maxResults: options.maxResults ?? 5,
      },
    );

    return new CvObjectDetector(detector);
  }

  detect(
    video: HTMLVideoElement,
    timestampMs: number,
  ): ObjectDetectionResult {
    const result = this.detector.detectForVideo(video, timestampMs);

    const objects: DetectedObject[] = result.detections.flatMap(
      (detection) => {
        const category = detection.categories[0];

        if (!category || category.categoryName === undefined) {
          return [];
        }

        return [
          {
            label: category.categoryName,
            score: category.score ?? 0,
          },
        ];
      },
    );

    return {
      objects,
      detectedAt: new Date().toISOString(),
    };
  }

  close(): void {
    this.detector.close();
  }
}