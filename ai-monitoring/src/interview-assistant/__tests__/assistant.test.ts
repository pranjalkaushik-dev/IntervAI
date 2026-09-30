import { describe, expect, it, vi, beforeEach } from "vitest";

import { interviewAssistantChain } from "../prompt.js";
import { generateInterviewAssistantResponse } from "../assistant.js";

vi.mock("../prompt.js", () => ({
  interviewAssistantChain: {
    invoke: vi.fn(),
  },
}));

const invokeMock = vi.mocked(interviewAssistantChain.invoke);

describe("Interview Assistant", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("generates a follow-up question", async () => {
    invokeMock.mockResolvedValue({
      action: "FOLLOW_UP",
      message: "Good start. Let's explore your reasoning further.",
      nextQuestion: "Why did you choose a hash map for this solution?",
      reason: "The candidate mentioned a hash map but did not explain why it was appropriate.",
    });

    const result = await generateInterviewAssistantResponse({
      currentQuestion: "How would you find duplicates in an array?",
      candidateAnswer:
        "I would use a hash map to keep track of the elements.",
      interviewType: "CODING",
      difficulty: "MEDIUM",
      previousTurns: [],
    });

    expect(result.action).toBe("FOLLOW_UP");
    expect(result.nextQuestion).toContain("hash map");
    expect(invokeMock).toHaveBeenCalledTimes(1);
  });

  it("moves to the next question when the answer is sufficient", async () => {
    invokeMock.mockResolvedValue({
      action: "NEXT_QUESTION",
      message: "Good explanation.",
      nextQuestion: "Explain the difference between a stack and a queue.",
      reason: "The candidate adequately explained the current concept.",
    });

    const result = await generateInterviewAssistantResponse({
      currentQuestion: "What is a binary search tree?",
      candidateAnswer:
        "A binary search tree is a tree where values smaller than a node are placed on the left and larger values on the right.",
      interviewType: "TEXT",
      difficulty: "EASY",
      previousTurns: [],
    });

    expect(result.action).toBe("NEXT_QUESTION");
    expect(result.nextQuestion).toContain("stack");
  });

  it("rejects an empty current question", async () => {
    await expect(
      generateInterviewAssistantResponse({
        currentQuestion: "   ",
        candidateAnswer: "My answer",
        interviewType: "TEXT",
        difficulty: "EASY",
        previousTurns: [],
      })
    ).rejects.toThrow("Current question must not be empty");

    expect(invokeMock).not.toHaveBeenCalled();
  });

  it("rejects an empty candidate answer", async () => {
    await expect(
      generateInterviewAssistantResponse({
        currentQuestion: "What is polymorphism?",
        candidateAnswer: "   ",
        interviewType: "TEXT",
        difficulty: "EASY",
        previousTurns: [],
      })
    ).rejects.toThrow("Candidate answer must not be empty");

    expect(invokeMock).not.toHaveBeenCalled();
  });
});