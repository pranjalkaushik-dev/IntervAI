import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  ObjectViolationTracker,
} from "../object-violation-tracker.js";

describe(
  "ObjectViolationTracker",
  () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it(
      "does not report before persistence threshold",
      () => {
        const onViolation =
          vi.fn();

        const tracker =
          new ObjectViolationTracker({
            persistenceMs: 2000,
            onViolation,
          });

        tracker.update(
          "2026-09-06T10:00:00.000Z",
          "cell phone",
          0.9,
          1000,
        );

        tracker.update(
          "2026-09-06T10:00:01.000Z",
          "cell phone",
          0.9,
          2000,
        );

        expect(
          onViolation,
        ).not.toHaveBeenCalled();
      },
    );

    it(
      "reports after persistence threshold",
      () => {
        const onViolation =
          vi.fn();

        const tracker =
          new ObjectViolationTracker({
            persistenceMs: 2000,
            onViolation,
          });

        tracker.update(
          "2026-09-06T10:00:00.000Z",
          "cell phone",
          0.91,
          1000,
        );

        tracker.update(
          "2026-09-06T10:00:02.000Z",
          "cell phone",
          0.91,
          3000,
        );

        expect(
          onViolation,
        ).toHaveBeenCalledTimes(
          1,
        );

        expect(
          onViolation,
        ).toHaveBeenCalledWith({
          type: "PROHIBITED_OBJECT",
          occurredAt:
            "2026-09-06T10:00:02.000Z",
          metadata: {
            objectType:
              "cell phone",
            confidence: 0.91,
          },
        });
      },
    );

    it(
      "does not repeatedly report the same violation",
      () => {
        const onViolation =
          vi.fn();

        const tracker =
          new ObjectViolationTracker({
            persistenceMs: 2000,
            onViolation,
          });

        tracker.update(
          "2026-09-06T10:00:00.000Z",
          "cell phone",
          0.9,
          1000,
        );

        tracker.update(
          "2026-09-06T10:00:02.000Z",
          "cell phone",
          0.9,
          3000,
        );

        tracker.update(
          "2026-09-06T10:00:03.000Z",
          "cell phone",
          0.95,
          4000,
        );

        expect(
          onViolation,
        ).toHaveBeenCalledTimes(
          1,
        );
      },
    );

    it(
      "clears when prohibited object disappears",
      () => {
        const tracker =
          new ObjectViolationTracker({
            persistenceMs: 2000,
          });

        tracker.update(
          "2026-09-06T10:00:00.000Z",
          "cell phone",
          0.9,
          1000,
        );

        expect(
          tracker.isActive(),
        ).toBe(true);

        tracker.clear();

        expect(
          tracker.isActive(),
        ).toBe(false);

        expect(
          tracker.isReported(),
        ).toBe(false);
      },
    );

    it(
      "can report again after being cleared",
      () => {
        const onViolation =
          vi.fn();

        const tracker =
          new ObjectViolationTracker({
            persistenceMs: 2000,
            onViolation,
          });

        tracker.update(
          "2026-09-06T10:00:00.000Z",
          "cell phone",
          0.9,
          1000,
        );

        tracker.update(
          "2026-09-06T10:00:02.000Z",
          "cell phone",
          0.9,
          3000,
        );

        expect(
          onViolation,
        ).toHaveBeenCalledTimes(
          1,
        );

        tracker.clear();

        tracker.update(
          "2026-09-06T10:01:00.000Z",
          "cell phone",
          0.92,
          5000,
        );

        tracker.update(
          "2026-09-06T10:01:02.000Z",
          "cell phone",
          0.92,
          7000,
        );

        expect(
          onViolation,
        ).toHaveBeenCalledTimes(
          2,
        );
      },
    );

    it(
      "tracks active and reported state",
      () => {
        const tracker =
          new ObjectViolationTracker({
            persistenceMs: 2000,
          });

        expect(
          tracker.isActive(),
        ).toBe(false);

        expect(
          tracker.isReported(),
        ).toBe(false);

        tracker.update(
          "2026-09-06T10:00:00.000Z",
          "cell phone",
          0.9,
          1000,
        );

        expect(
          tracker.isActive(),
        ).toBe(true);

        expect(
          tracker.isReported(),
        ).toBe(false);

        tracker.update(
          "2026-09-06T10:00:02.000Z",
          "cell phone",
          0.9,
          3000,
        );

        expect(
          tracker.isActive(),
        ).toBe(true);

        expect(
          tracker.isReported(),
        ).toBe(true);
      },
    );
  },
);