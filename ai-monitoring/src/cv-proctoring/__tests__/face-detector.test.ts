import { describe, expect, it } from "vitest";
import { classifyFaceCount } from "../face-detector.js";

describe("CV Face Detector", () => {
  it("classifies zero detected faces as NO_FACE", () => {
    expect(classifyFaceCount(0)).toBe("NO_FACE");
  });

  it("classifies one detected face as ONE_FACE", () => {
    expect(classifyFaceCount(1)).toBe("ONE_FACE");
  });

  it("classifies multiple detected faces as MULTIPLE_FACES", () => {
    expect(classifyFaceCount(2)).toBe("MULTIPLE_FACES");
  });

  it("classifies any count above one as MULTIPLE_FACES", () => {
    expect(classifyFaceCount(5)).toBe("MULTIPLE_FACES");
  });
});