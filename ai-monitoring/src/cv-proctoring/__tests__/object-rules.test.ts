import { describe, expect, it } from "vitest";

import { detectProhibitedObjects } from "../object-rules.js";

describe("detectProhibitedObjects", () => {
  it("detects a cell phone", () => {
    const result = detectProhibitedObjects([
      {
        label: "cell phone",
        score: 0.91,
      },
    ]);

    expect(result).toEqual([
      {
        type: "CELL_PHONE",
        label: "cell phone",
        score: 0.91,
      },
    ]);
  });

  it("detects mobile phone", () => {
    const result = detectProhibitedObjects([
      {
        label: "mobile phone",
        score: 0.88,
      },
    ]);

    expect(result).toHaveLength(1);
  });

  it("ignores normal objects", () => {
    const result = detectProhibitedObjects([
      {
        label: "person",
        score: 0.95,
      },
      {
        label: "chair",
        score: 0.82,
      },
    ]);

    expect(result).toEqual([]);
  });

  it("supports multiple objects", () => {
    const result = detectProhibitedObjects([
      {
        label: "cell phone",
        score: 0.92,
      },
      {
        label: "person",
        score: 0.97,
      },
    ]);

    expect(result).toHaveLength(1);
    expect(result[0]?.type).toBe("CELL_PHONE");
  });
});