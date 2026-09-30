import { describe, expect, it, vi } from "vitest";

import { generateAdaptiveInterviewStep } from "../integration.js";

const { evaluateAnswerMock, invokeMock } = vi.hoisted(() => ({
  evaluateAnswerMock: vi.fn(),
  invokeMock: vi.fn(),
}));

vi.mock("../../answer-evaluation/evaluator.js", () => ({
  evaluateAnswer: evaluateAnswerMock,
}));

vi.mock("../prompt.js", () => ({
  interviewAssistantChain: {
    invoke: invokeMock,
  },
}));

describe("generateAdaptiveInterviewStep", () => {
  it("evaluates the answer and then generates an adaptive interview decision", async () => {
    evaluateAnswerMock.mockResolvedValue({
      summary: "The candidate correctly explained hashing.",
      strengths: ["Understands hash maps"],
      improvements: ["Could explain collision handling better"],
      technicalScore: 82,
      communicationScore: 88,
      recommendation: "HIRE",
    });

    invokeMock.mockResolvedValue({
      action: "FOLLOW_UP",
      message: "Let's explore collision handling.",
      nextQuestion: "How would you handle collisions in a hash table?",
      reason: "The candidate demonstrated understanding but did not explain collisions.",
    });

    const result = await generateAdaptiveInterviewStep({
      currentQuestion: "What is a hash map?",
      candidateAnswer:
        "A hash map stores key-value pairs and usually provides O(1) lookup.",
      expectedKeywords: ["key-value", "hash function", "O(1)"],
      interviewType: "TEXT",
      difficulty: "MEDIUM",
      previousTurns: [],
    });

    expect(evaluateAnswerMock).toHaveBeenCalledWith({
      question: "What is a hash map?",
      candidateAnswer:
        "A hash map stores key-value pairs and usually provides O(1) lookup.",
      expectedKeywords: ["key-value", "hash function", "O(1)"],
      interviewType: "TEXT",
    });

    expect(invokeMock).toHaveBeenCalledWith(
      expect.objectContaining({
        currentQuestion: "What is a hash map?",
        candidateAnswer:
          "A hash map stores key-value pairs and usually provides O(1) lookup.",
        interviewType: "TEXT",
        difficulty: "MEDIUM",
        previousTurns: expect.stringContaining(
          "The candidate correctly explained hashing."
        ),
      })
    );

    expect(result.evaluation.technicalScore).toBe(82);
    expect(result.evaluation.communicationScore).toBe(88);

    expect(result.assistant.action).toBe("FOLLOW_UP");
    expect(result.assistant.nextQuestion).toBe(
      "How would you handle collisions in a hash table?"
    );

    expect(result.updatedTurns).toHaveLength(1);
    expect(result.updatedTurns[0]).toMatchObject({
      question: "What is a hash map?",
      candidateAnswer:
        "A hash map stores key-value pairs and usually provides O(1) lookup.",
      technicalScore: 82,
      communicationScore: 88,
      summary: "The candidate correctly explained hashing.",
    });
  });

  it("preserves previous interview turns", async () => {
    evaluateAnswerMock.mockResolvedValue({
      summary: "Good answer.",
      strengths: ["Clear explanation"],
      improvements: [],
      technicalScore: 90,
      communicationScore: 90,
      recommendation: "STRONG_HIRE",
    });

    invokeMock.mockResolvedValue({
      action: "NEXT_QUESTION",
      message: "Good explanation. Let's move on.",
      nextQuestion: "What is a binary search tree?",
      reason: "The candidate demonstrated sufficient understanding.",
    });

    const previousTurn = {
      question: "What is Big O notation?",
      candidateAnswer: "It describes algorithmic growth.",
      technicalScore: 85,
      communicationScore: 87,
      summary: "Correct but brief.",
    };

    const result = await generateAdaptiveInterviewStep({
      currentQuestion: "What is a stack?",
      candidateAnswer: "A stack follows LIFO.",
      expectedKeywords: ["LIFO"],
      interviewType: "TEXT",
      difficulty: "EASY",
      previousTurns: [previousTurn],
    });

    expect(result.updatedTurns).toHaveLength(2);
    expect(result.updatedTurns[0]).toEqual(previousTurn);
    expect(result.updatedTurns[1]).toMatchObject({
      question: "What is a stack?",
      candidateAnswer: "A stack follows LIFO.",
      technicalScore: 90,
      communicationScore: 90,
    });

    expect(invokeMock).toHaveBeenCalledWith(
      expect.objectContaining({
        previousTurns: expect.stringContaining(
          "What is Big O notation?"
        ),
      })
    );
  });

  it("propagates answer evaluation failures", async () => {
    evaluateAnswerMock.mockRejectedValue(
      new Error("Answer evaluation failed")
    );

    await expect(
      generateAdaptiveInterviewStep({
        currentQuestion: "What is recursion?",
        candidateAnswer: "A function calling itself.",
        expectedKeywords: ["recursive"],
        interviewType: "TEXT",
        difficulty: "MEDIUM",
        previousTurns: [],
      })
    ).rejects.toThrow("Answer evaluation failed");

    expect(invokeMock).not.toHaveBeenCalled();
  });
});