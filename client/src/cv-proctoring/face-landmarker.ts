import {
  FaceLandmarker,
  FilesetResolver,
} from "@mediapipe/tasks-vision";

const WASM_PATH =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm";

const MODEL_PATH =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

export interface FaceLandmarkOptions {
  minFaceDetectionConfidence?: number;
  minFacePresenceConfidence?: number;
  minTrackingConfidence?: number;
}

export interface FaceLandmarkResult {
  landmarks: ReadonlyArray<
    ReadonlyArray<{
      x: number;
      y: number;
      z: number;
    }>
  >;
  detectedAt: string;
}

export class CvFaceLandmarker {
  private constructor(
    private readonly landmarker: FaceLandmarker,
  ) {}

  static async create(
    options: FaceLandmarkOptions = {},
  ): Promise<CvFaceLandmarker> {
    const vision = await FilesetResolver.forVisionTasks(WASM_PATH);

    const landmarker = await FaceLandmarker.createFromOptions(
      vision,
      {
        baseOptions: {
          modelAssetPath: MODEL_PATH,
        },
        runningMode: "VIDEO",
        numFaces: 1,
        minFaceDetectionConfidence:
          options.minFaceDetectionConfidence ?? 0.5,
        minFacePresenceConfidence:
          options.minFacePresenceConfidence ?? 0.5,
        minTrackingConfidence:
          options.minTrackingConfidence ?? 0.5,
      },
    );

    return new CvFaceLandmarker(landmarker);
  }

  detect(
    video: HTMLVideoElement,
    timestampMs: number,
  ): FaceLandmarkResult {
    const result = this.landmarker.detectForVideo(
      video,
      timestampMs,
    );

    return {
      landmarks: result.faceLandmarks,
      detectedAt: new Date().toISOString(),
    };
  }

  close(): void {
    this.landmarker.close();
  }
}