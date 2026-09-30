import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  ObjectDetectionLoop,
} from "../object-detection-loop.js";

describe(
  "ObjectDetectionLoop",
  () => {
    afterEach(() => {
      vi.useRealTimers();
      vi.restoreAllMocks();
    });

    function createVideo(): HTMLVideoElement {
      const video =
        document.createElement(
          "video",
        );

      Object.defineProperty(
        video,
        "readyState",
        {
          value:
            HTMLMediaElement.HAVE_CURRENT_DATA,
        },
      );

      Object.defineProperty(
        video,
        "videoWidth",
        {
          value: 640,
        },
      );

      Object.defineProperty(
        video,
        "videoHeight",
        {
          value: 480,
        },
      );

      return video;
    }

    it(
      "detects immediately when started",
      () => {
        const video =
          createVideo();

        const detector = {
          detect: vi.fn(
            () => ({
              objects: [],
              detectedAt:
                "2026-09-06T10:00:00.000Z",
            }),
          ),
        };

        const onDetection =
          vi.fn();

        const loop =
          new ObjectDetectionLoop(
            detector as never,
            video,
            {
              intervalMs: 500,
              onDetection,
            },
          );

        loop.start();

        expect(
          detector.detect,
        ).toHaveBeenCalledTimes(
          1,
        );

        expect(
          onDetection,
        ).toHaveBeenCalledTimes(
          1,
        );

        loop.stop();
      },
    );

    it(
      "runs repeatedly at configured interval",
      () => {
        vi.useFakeTimers();

        const video =
          createVideo();

        const detector = {
          detect: vi.fn(
            () => ({
              objects: [],
              detectedAt:
                "2026-09-06T10:00:00.000Z",
            }),
          ),
        };

        const onDetection =
          vi.fn();

        const loop =
          new ObjectDetectionLoop(
            detector as never,
            video,
            {
              intervalMs: 500,
              onDetection,
            },
          );

        loop.start();

        expect(
          detector.detect,
        ).toHaveBeenCalledTimes(
          1,
        );

        vi.advanceTimersByTime(
          500,
        );

        expect(
          detector.detect,
        ).toHaveBeenCalledTimes(
          2,
        );

        vi.advanceTimersByTime(
          1000,
        );

        expect(
          detector.detect,
        ).toHaveBeenCalledTimes(
          4,
        );

        loop.stop();
      },
    );

    it(
      "does not detect when video is not ready",
      () => {
        const video =
          document.createElement(
            "video",
          );

        Object.defineProperty(
          video,
          "readyState",
          {
            value:
              HTMLMediaElement.HAVE_NOTHING,
          },
        );

        Object.defineProperty(
          video,
          "videoWidth",
          {
            value: 640,
          },
        );

        Object.defineProperty(
          video,
          "videoHeight",
          {
            value: 480,
          },
        );

        const detector = {
          detect: vi.fn(),
        };

        const onDetection =
          vi.fn();

        const loop =
          new ObjectDetectionLoop(
            detector as never,
            video,
            {
              onDetection,
            },
          );

        loop.start();

        expect(
          detector.detect,
        ).not.toHaveBeenCalled();

        expect(
          onDetection,
        ).not.toHaveBeenCalled();

        loop.stop();
      },
    );

    it(
      "stops detecting after stop",
      () => {
        vi.useFakeTimers();

        const video =
          createVideo();

        const detector = {
          detect: vi.fn(
            () => ({
              objects: [],
              detectedAt:
                "2026-09-06T10:00:00.000Z",
            }),
          ),
        };

        const onDetection =
          vi.fn();

        const loop =
          new ObjectDetectionLoop(
            detector as never,
            video,
            {
              intervalMs: 500,
              onDetection,
            },
          );

        loop.start();

        loop.stop();

        vi.advanceTimersByTime(
          2000,
        );

        expect(
          detector.detect,
        ).toHaveBeenCalledTimes(
          1,
        );

        expect(
          loop.isRunning(),
        ).toBe(false);
      },
    );
  },
);
