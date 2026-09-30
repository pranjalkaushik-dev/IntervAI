import { describe, expect, it } from "vitest";
import { answerEvaluationSchema } from "../schema.js";

describe("Answer Evaluation Schema", () => {
  it("accepts a valid evaluation", () => {
    const result = answerEvaluationSchema.safeParse({
      summary: "The candidate demonstrated a good understanding of arrays.",
      strengths: [
        "Correctly explained the algorithm",
        "Identified the time complexity",
      ],
      improvements: [
        "Could explain edge cases more clearly",
      ],
      technicalScore: 85,
      communicationScore: 80,
      recommendation: "HIRE",
    });

    expect(result.success).toBe(true);
  });

  it("accepts a null recommendation", () => {
    const result = answerEvaluationSchema.safeParse({
      summary: "There is insufficient information to evaluate the candidate.",
      strengths: ["Provided a partial explanation"],
      improvements: ["Provide more details"],
      technicalScore: 50,
      communicationScore: 50,
      recommendation: null,
    });

    expect(result.success).toBe(true);
  });

  it("rejects a technical score below 0", () => {
    const result = answerEvaluationSchema.safeParse({
      summary: "Test evaluation",
      strengths: ["Some strength"],
      improvements: ["Some improvement"],
      technicalScore: -1,
      communicationScore: 80,
      recommendation: "MAYBE",
    });

    expect(result.success).toBe(false);
  });

  it("rejects a technical score above 100", () => {
    const result = answerEvaluationSchema.safeParse({
      summary: "Test evaluation",
      strengths: ["Some strength"],
      improvements: ["Some improvement"],
      technicalScore: 101,
      communicationScore: 80,
      recommendation: "MAYBE",
    });

    expect(result.success).toBe(false);
  });

  it("rejects a communication score above 100", () => {
    const result = answerEvaluationSchema.safeParse({
      summary: "Test evaluation",
      strengths: ["Some strength"],
      improvements: ["Some improvement"],
      technicalScore: 80,
      communicationScore: 101,
      recommendation: "HIRE",
    });

    expect(result.success).toBe(false);
  });

  it("rejects an invalid recommendation", () => {
    const result = answerEvaluationSchema.safeParse({
      summary: "Test evaluation",
      strengths: ["Some strength"],
      improvements: ["Some improvement"],
      technicalScore: 80,
      communicationScore: 80,
      recommendation: "MAYBE_HIRE",
    });

    expect(result.success).toBe(false);
  });

  it("rejects an evaluation without strengths", () => {
    const result = answerEvaluationSchema.safeParse({
      summary: "Test evaluation",
      strengths: [],
      improvements: ["Some improvement"],
      technicalScore: 80,
      communicationScore: 80,
      recommendation: "HIRE",
    });

    expect(result.success).toBe(false);
  });

  it("rejects an evaluation without improvements", () => {
    const result = answerEvaluationSchema.safeParse({
      summary: "Test evaluation",
      strengths: ["Some strength"],
      improvements: [],
      technicalScore: 80,
      communicationScore: 80,
      recommendation: "HIRE",
    });

    expect(result.success).toBe(false);
  });
});