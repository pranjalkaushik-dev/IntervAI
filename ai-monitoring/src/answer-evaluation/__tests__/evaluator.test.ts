import { beforeEach, describe, expect, it, vi } from "vitest";

const { invokeMock } = vi.hoisted(() => ({
  invokeMock: vi.fn(),
}));

vi.mock("../prompt.js", () => ({
  answerEvaluationChain: {
    invoke: invokeMock,
  },
}));

import { evaluateAnswer } from "../evaluator.js";

describe("Answer Evaluator", () => {
  beforeEach(() => {
    invokeMock.mockReset();
  });

  it("evaluates a valid candidate answer successfully", async () => {
    invokeMock.mockResolvedValue({
      summary:
        "The candidate demonstrated a strong understanding of the sliding window technique.",
      strengths: [
        "Identified the sliding window approach",
        "Explained the linear time complexity",
      ],
      improvements: [
        "Could explain edge cases in more detail",
      ],
      technicalScore: 88,
      communicationScore: 82,
      recommendation: "HIRE",
    });

    const result = await evaluateAnswer({
      question:
        "Find the maximum sum of a contiguous subarray of size k.",
      candidateAnswer:
        "I would use a sliding window. First calculate the sum of the first k elements, then move the window by removing the left element and adding the new right element. This gives O(n) time complexity.",
      expectedKeywords: [
        "sliding window",
        "subarray",
        "O(n)",
      ],
      interviewType: "CODING",
    });

    expect(result.summary).toContain(
      "strong understanding"
    );
    expect(result.technicalScore).toBe(88);
    expect(result.communicationScore).toBe(82);
    expect(result.recommendation).toBe("HIRE");
    expect(result.strengths).toHaveLength(2);
    expect(result.improvements).toHaveLength(1);

    expect(invokeMock).toHaveBeenCalledTimes(1);
  });

  it("sends the question and candidate answer to LangChain", async () => {
    invokeMock.mockResolvedValue({
      summary:
        "The candidate provided a reasonable answer.",
      strengths: ["Correct approach"],
      improvements: [
        "Explain complexity more clearly",
      ],
      technicalScore: 75,
      communicationScore: 70,
      recommendation: "MAYBE",
    });

    await evaluateAnswer({
      question: "What is a database index?",
      candidateAnswer:
        "An index helps the database find records faster.",
      expectedKeywords: [
        "index",
        "query performance",
      ],
      interviewType: "TEXT",
    });

    expect(invokeMock).toHaveBeenCalledTimes(1);

    const call = invokeMock.mock.calls[0]?.[0];

    expect(call?.question).toBe(
      "What is a database index?"
    );

    expect(call?.candidateAnswer).toBe(
      "An index helps the database find records faster."
    );

    expect(call?.expectedKeywords).toContain(
      "index"
    );

    expect(call?.interviewType).toBe("TEXT");
  });

  it("throws when the evaluation chain returns invalid data", async () => {
    invokeMock.mockResolvedValue({
      summary: "",
      strengths: [],
      improvements: [],
      technicalScore: 150,
      communicationScore: -10,
      recommendation: "INVALID",
    });

    await expect(
      evaluateAnswer({
        question: "Explain REST APIs.",
        candidateAnswer:
          "REST APIs allow systems to communicate using HTTP.",
        expectedKeywords: ["HTTP", "REST"],
        interviewType: "TEXT",
      })
    ).rejects.toThrow();
  });

  it("throws when the evaluation chain fails", async () => {
    invokeMock.mockRejectedValue(
      new Error("Gemini service unavailable")
    );

    await expect(
      evaluateAnswer({
        question: "Explain REST APIs.",
        candidateAnswer: "REST uses HTTP.",
        expectedKeywords: ["REST", "HTTP"],
        interviewType: "TEXT",
      })
    ).rejects.toThrow(
      "Gemini service unavailable"
    );
  });
});