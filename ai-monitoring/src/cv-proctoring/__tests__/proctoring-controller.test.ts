import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  CvProctoringController,
} from "../proctoring-controller.js";

import type {
  CvViolation,
} from "../types.js";

/* -------------------------------------------------------------------------- */
/* Camera mock                                                                */
/* -------------------------------------------------------------------------- */

const cameraMock = vi.hoisted(() => ({
  start: vi.fn(async () => undefined),
  attachToVideo: vi.fn(),
  stop: vi.fn(),
  isActive: vi.fn(() => true),
}));

vi.mock("../camera.js", () => ({
  CvCamera: vi.fn(
    class {
      start = cameraMock.start;
      attachToVideo = cameraMock.attachToVideo;
      stop = cameraMock.stop;
      isActive = cameraMock.isActive;
    },
  ),
}));

/* -------------------------------------------------------------------------- */
/* Face detector mock                                                         */
/* -------------------------------------------------------------------------- */

const faceDetectorMock = vi.hoisted(() => ({
  detect: vi.fn(() => ({
    status: "ONE_FACE",
    faceCount: 1,
    detectedAt: new Date().toISOString(),
  })),
  close: vi.fn(),
}));

const faceDetectorCreateMock = vi.hoisted(() =>
  vi.fn(async () => faceDetectorMock),
);

vi.mock("../face-detector.js", () => ({
  CvFaceDetector: {
    create: faceDetectorCreateMock,
  },
}));

/* -------------------------------------------------------------------------- */
/* Object detector mock                                                       */
/* -------------------------------------------------------------------------- */

const objectDetectorMock = vi.hoisted(() => ({
  detect: vi.fn(() => ({
    objects: [],
    detectedAt: new Date().toISOString(),
  })),
  close: vi.fn(),
}));

const objectDetectorCreateMock = vi.hoisted(() =>
  vi.fn(async () => objectDetectorMock),
);

vi.mock("../object-detector.js", () => ({
  CvObjectDetector: {
    create: objectDetectorCreateMock,
  },
}));

/* -------------------------------------------------------------------------- */
/* Face landmarker mock                                                       */
/* -------------------------------------------------------------------------- */

const faceLandmarkerMock = vi.hoisted(() => ({
  detect: vi.fn(() => ({
    landmarks: [],
    detectedAt: Date.now(),
  })),
  close: vi.fn(),
}));

const faceLandmarkerCreateMock = vi.hoisted(() =>
  vi.fn(async () => faceLandmarkerMock),
);

vi.mock("../face-landmarker.js", () => ({
  CvFaceLandmarker: {
    create: faceLandmarkerCreateMock,
  },
}));

/* -------------------------------------------------------------------------- */
/* Face detection loop mock                                                   */
/* -------------------------------------------------------------------------- */

const faceLoopMock = vi.hoisted(() => ({
  start: vi.fn(),
  stop: vi.fn(),
}));

vi.mock("../detection-loop.js", () => ({
  FaceDetectionLoop: vi.fn(
    class {
      start = faceLoopMock.start;
      stop = faceLoopMock.stop;
    },
  ),
}));

/* -------------------------------------------------------------------------- */
/* Object detection loop mock                                                 */
/* -------------------------------------------------------------------------- */

const objectLoopMock = vi.hoisted(() => ({
  start: vi.fn(),
  stop: vi.fn(),
}));

vi.mock("../object-detection-loop.js", () => ({
  ObjectDetectionLoop: vi.fn(
    class {
      start = objectLoopMock.start;
      stop = objectLoopMock.stop;
    },
  ),
}));

/* -------------------------------------------------------------------------- */
/* Head pose detection loop mock                                              */
/* -------------------------------------------------------------------------- */

const headPoseLoopMock = vi.hoisted(() => ({
  start: vi.fn(),
  stop: vi.fn(),
}));

vi.mock("../head-pose-detection-loop.js", () => ({
  HeadPoseDetectionLoop: vi.fn(
    class {
      start = headPoseLoopMock.start;
      stop = headPoseLoopMock.stop;
    },
  ),
}));

/* -------------------------------------------------------------------------- */
/* Tests                                                                      */
/* -------------------------------------------------------------------------- */

describe("CvProctoringController", () => {
  let controller: CvProctoringController;
  let video: HTMLVideoElement;

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();

    cameraMock.start.mockResolvedValue(undefined);
    cameraMock.isActive.mockReturnValue(true);

    faceDetectorCreateMock.mockResolvedValue(
      faceDetectorMock,
    );

    objectDetectorCreateMock.mockResolvedValue(
      objectDetectorMock,
    );

    faceLandmarkerCreateMock.mockResolvedValue(
      faceLandmarkerMock,
    );

    video =
      document.createElement("video");

    controller =
      new CvProctoringController();
  });

  /* ------------------------------------------------------------------------ */
  /* Startup                                                                  */
  /* ------------------------------------------------------------------------ */

  it(
    "starts camera and both detection pipelines",
    async () => {
      await controller.start(video);

      expect(
        cameraMock.start,
      ).toHaveBeenCalledTimes(1);

      expect(
        cameraMock.attachToVideo,
      ).toHaveBeenCalledWith(video);

      expect(
        faceDetectorCreateMock,
      ).toHaveBeenCalledTimes(1);

      expect(
        objectDetectorCreateMock,
      ).toHaveBeenCalledTimes(1);

      expect(
        faceLandmarkerCreateMock,
      ).toHaveBeenCalledTimes(1);

      expect(
        faceLoopMock.start,
      ).toHaveBeenCalledTimes(1);

      expect(
        objectLoopMock.start,
      ).toHaveBeenCalledTimes(1);

      expect(
        headPoseLoopMock.start,
      ).toHaveBeenCalledTimes(1);

      expect(
        controller.isRunning(),
      ).toBe(true);
    },
  );

  it(
    "does not start twice",
    async () => {
      await controller.start(video);

      await controller.start(video);

      expect(
        cameraMock.start,
      ).toHaveBeenCalledTimes(1);

      expect(
        faceDetectorCreateMock,
      ).toHaveBeenCalledTimes(1);

      expect(
        objectDetectorCreateMock,
      ).toHaveBeenCalledTimes(1);

      expect(
        faceLandmarkerCreateMock,
      ).toHaveBeenCalledTimes(1);

      expect(
        faceLoopMock.start,
      ).toHaveBeenCalledTimes(1);

      expect(
        objectLoopMock.start,
      ).toHaveBeenCalledTimes(1);

      expect(
        headPoseLoopMock.start,
      ).toHaveBeenCalledTimes(1);
    },
  );

  /* ------------------------------------------------------------------------ */
  /* Stop                                                                     */
  /* ------------------------------------------------------------------------ */

  it(
    "stops both detection pipelines",
    async () => {
      await controller.start(video);

      controller.stop();

      expect(
        faceLoopMock.stop,
      ).toHaveBeenCalledTimes(1);

      expect(
        objectLoopMock.stop,
      ).toHaveBeenCalledTimes(1);

      expect(
        headPoseLoopMock.stop,
      ).toHaveBeenCalledTimes(1);

      expect(
        faceDetectorMock.close,
      ).toHaveBeenCalledTimes(1);

      expect(
        objectDetectorMock.close,
      ).toHaveBeenCalledTimes(1);

      expect(
        faceLandmarkerMock.close,
      ).toHaveBeenCalledTimes(1);

      expect(
        cameraMock.stop,
      ).toHaveBeenCalledTimes(1);

      expect(
        video.srcObject,
      ).toBeNull();

      expect(
        controller.isRunning(),
      ).toBe(false);
    },
  );

  /* ------------------------------------------------------------------------ */
  /* Configuration                                                            */
  /* ------------------------------------------------------------------------ */

  it(
    "passes custom face confidence",
    async () => {
      controller =
        new CvProctoringController({
          minDetectionConfidence: 0.8,
        });

      await controller.start(video);

      expect(
        faceDetectorCreateMock,
      ).toHaveBeenCalledWith({
        minDetectionConfidence: 0.8,
      });

      expect(
        faceLandmarkerCreateMock,
      ).toHaveBeenCalledWith({
        minFaceDetectionConfidence: 0.8,
        minFacePresenceConfidence: 0.8,
        minTrackingConfidence: 0.8,
      });
    },
  );

  it(
    "passes custom object settings",
    async () => {
      controller =
        new CvProctoringController({
          objectDetectionConfidence: 0.7,
          maxObjectResults: 10,
        });

      await controller.start(video);

      expect(
        objectDetectorCreateMock,
      ).toHaveBeenCalledWith({
        minDetectionConfidence: 0.7,
        maxResults: 10,
      });
    },
  );

  /* ------------------------------------------------------------------------ */
  /* Candidate absent                                                         */
  /* ------------------------------------------------------------------------ */

  it(
    "reports candidate absent after persistence",
    () => {
      const violations: CvViolation[] =
        [];

      controller =
        new CvProctoringController({
          violationPersistenceMs: 2000,

          callbacks: {
            onViolation: (
              violation,
            ) => {
              violations.push(
                violation,
              );
            },
          },
        });

      const detectedAt =
        new Date().toISOString();

      controller.processDetection({
        status: "NO_FACE",
        faceCount: 0,
        detectedAt,
      });

      expect(
        violations,
      ).toHaveLength(0);

      const now =
        Date.now();

      vi.spyOn(
        Date,
        "now",
      ).mockReturnValue(
        now + 2001,
      );

      controller.processDetection({
        status: "NO_FACE",
        faceCount: 0,
        detectedAt,
      });

      expect(
        violations,
      ).toHaveLength(1);

      expect(
        violations[0]?.type,
      ).toBe(
        "CANDIDATE_ABSENT",
      );
    },
  );

  /* ------------------------------------------------------------------------ */
  /* One face                                                                 */
  /* ------------------------------------------------------------------------ */

  it(
    "does not report violation for one face",
    () => {
      const violations: CvViolation[] =
        [];

      controller =
        new CvProctoringController({
          violationPersistenceMs: 2000,

          callbacks: {
            onViolation: (
              violation,
            ) => {
              violations.push(
                violation,
              );
            },
          },
        });

      controller.processDetection({
        status: "ONE_FACE",
        faceCount: 1,
        detectedAt:
          new Date().toISOString(),
      });

      expect(
        violations,
      ).toHaveLength(0);
    },
  );

  /* ------------------------------------------------------------------------ */
  /* Multiple people                                                          */
  /* ------------------------------------------------------------------------ */

  it(
    "reports multiple people after persistence",
    () => {
      const violations: CvViolation[] =
        [];

      controller =
        new CvProctoringController({
          violationPersistenceMs: 2000,

          callbacks: {
            onViolation: (
              violation,
            ) => {
              violations.push(
                violation,
              );
            },
          },
        });

      const detectedAt =
        new Date().toISOString();

      controller.processDetection({
        status:
          "MULTIPLE_FACES",
        faceCount: 2,
        detectedAt,
      });

      expect(
        violations,
      ).toHaveLength(0);

      const now =
        Date.now();

      vi.spyOn(
        Date,
        "now",
      ).mockReturnValue(
        now + 2001,
      );

      controller.processDetection({
        status:
          "MULTIPLE_FACES",
        faceCount: 2,
        detectedAt,
      });

      expect(
        violations,
      ).toHaveLength(1);

      expect(
        violations[0]?.type,
      ).toBe(
        "MULTIPLE_PEOPLE",
      );
    },
  );

  /* ------------------------------------------------------------------------ */
  /* Prohibited object                                                        */
  /* ------------------------------------------------------------------------ */

  it(
    "reports prohibited object after persistence",
    () => {
      const violations: CvViolation[] =
        [];

      controller =
        new CvProctoringController({
          violationPersistenceMs: 2000,

          callbacks: {
            onViolation: (
              violation,
            ) => {
              violations.push(
                violation,
              );
            },
          },
        });

      const detectedAt =
        new Date().toISOString();

      controller.processObjectDetection({
        objects: [
          {
            label: "cell phone",
            score: 0.95,
          },
        ],
        detectedAt,
      });

      expect(
        violations,
      ).toHaveLength(0);

      const now =
        Date.now();

      vi.spyOn(
        Date,
        "now",
      ).mockReturnValue(
        now + 2001,
      );

      controller.processObjectDetection({
        objects: [
          {
            label: "cell phone",
            score: 0.95,
          },
        ],
        detectedAt,
      });

      expect(
        violations,
      ).toHaveLength(1);

      expect(
        violations[0]?.type,
      ).toBe(
        "PROHIBITED_OBJECT",
      );
    },
  );

  /* ------------------------------------------------------------------------ */
  /* Object disappears                                                        */
  /* ------------------------------------------------------------------------ */

  it(
    "does not report a phone if it disappears",
    () => {
      const violations: CvViolation[] =
        [];

      controller =
        new CvProctoringController({
          violationPersistenceMs: 2000,

          callbacks: {
            onViolation: (
              violation,
            ) => {
              violations.push(
                violation,
              );
            },
          },
        });

      controller.processObjectDetection({
        objects: [
          {
            label: "cell phone",
            score: 0.95,
          },
        ],
        detectedAt:
          new Date().toISOString(),
      });

      controller.processObjectDetection({
        objects: [],
        detectedAt:
          new Date().toISOString(),
      });

      expect(
        violations,
      ).toHaveLength(0);
    },
  );
});