import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  CvViolationTracker,
} from "../violation-tracker.js";

describe(
  "CV Violation Tracker",
  () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it(
      "does not report a violation before the persistence threshold",
      () => {
        const onViolation =
          vi.fn();

        const tracker =
          new CvViolationTracker({
            persistenceMs: 2000,
            onViolation,
          });

        tracker.update(
          "CANDIDATE_ABSENT",
          "2026-09-05T00:00:00.000Z",
          0,
          1000
        );

        tracker.update(
          "CANDIDATE_ABSENT",
          "2026-09-05T00:00:01.000Z",
          0,
          2000
        );

        expect(
          onViolation
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "reports CANDIDATE_ABSENT after the persistence threshold",
      () => {
        const onViolation =
          vi.fn();

        const tracker =
          new CvViolationTracker({
            persistenceMs: 2000,
            onViolation,
          });

        tracker.update(
          "CANDIDATE_ABSENT",
          "2026-09-05T00:00:00.000Z",
          0,
          1000
        );

        tracker.update(
          "CANDIDATE_ABSENT",
          "2026-09-05T00:00:02.000Z",
          0,
          3000
        );

        expect(
          onViolation
        ).toHaveBeenCalledTimes(1);

        expect(
          onViolation
        ).toHaveBeenCalledWith({
          type: "CANDIDATE_ABSENT",
          occurredAt:
            "2026-09-05T00:00:02.000Z",
          metadata: {
            faceCount: 0,
          },
        });
      }
    );

    it(
      "reports MULTIPLE_PEOPLE after the persistence threshold",
      () => {
        const onViolation =
          vi.fn();

        const tracker =
          new CvViolationTracker({
            persistenceMs: 2000,
            onViolation,
          });

        tracker.update(
          "MULTIPLE_PEOPLE",
          "2026-09-05T00:00:00.000Z",
          2,
          1000
        );

        tracker.update(
          "MULTIPLE_PEOPLE",
          "2026-09-05T00:00:02.000Z",
          2,
          3000
        );

        expect(
          onViolation
        ).toHaveBeenCalledTimes(1);

        expect(
          onViolation
        ).toHaveBeenCalledWith({
          type: "MULTIPLE_PEOPLE",
          occurredAt:
            "2026-09-05T00:00:02.000Z",
          metadata: {
            faceCount: 2,
          },
        });
      }
    );

    it(
      "does not report the same violation repeatedly",
      () => {
        const onViolation =
          vi.fn();

        const tracker =
          new CvViolationTracker({
            persistenceMs: 2000,
            onViolation,
          });

        tracker.update(
          "CANDIDATE_ABSENT",
          "2026-09-05T00:00:00.000Z",
          0,
          1000
        );

        tracker.update(
          "CANDIDATE_ABSENT",
          "2026-09-05T00:00:02.000Z",
          0,
          3000
        );

        tracker.update(
          "CANDIDATE_ABSENT",
          "2026-09-05T00:00:03.000Z",
          0,
          4000
        );

        expect(
          onViolation
        ).toHaveBeenCalledTimes(1);
      }
    );

    it(
      "allows a violation to be reported again after clearing",
      () => {
        const onViolation =
          vi.fn();

        const tracker =
          new CvViolationTracker({
            persistenceMs: 2000,
            onViolation,
          });

        tracker.update(
          "CANDIDATE_ABSENT",
          "2026-09-05T00:00:00.000Z",
          0,
          1000
        );

        tracker.update(
          "CANDIDATE_ABSENT",
          "2026-09-05T00:00:02.000Z",
          0,
          3000
        );

        tracker.clear(
          "CANDIDATE_ABSENT"
        );

        tracker.update(
          "CANDIDATE_ABSENT",
          "2026-09-05T00:00:04.000Z",
          0,
          5000
        );

        tracker.update(
          "CANDIDATE_ABSENT",
          "2026-09-05T00:00:06.000Z",
          0,
          7000
        );

        expect(
          onViolation
        ).toHaveBeenCalledTimes(2);
      }
    );

    it(
      "clears all tracked violations",
      () => {
        const tracker =
          new CvViolationTracker({
            persistenceMs: 2000,
          });

        tracker.update(
          "CANDIDATE_ABSENT",
          "2026-09-05T00:00:00.000Z",
          0,
          1000
        );

        tracker.update(
          "MULTIPLE_PEOPLE",
          "2026-09-05T00:00:00.000Z",
          2,
          1000
        );

        expect(
          tracker.isActive(
            "CANDIDATE_ABSENT"
          )
        ).toBe(true);

        expect(
          tracker.isActive(
            "MULTIPLE_PEOPLE"
          )
        ).toBe(true);

        tracker.clearAll();

        expect(
          tracker.isActive(
            "CANDIDATE_ABSENT"
          )
        ).toBe(false);

        expect(
          tracker.isActive(
            "MULTIPLE_PEOPLE"
          )
        ).toBe(false);
      }
    );
  }
);