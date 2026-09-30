import { beforeEach, describe, expect, it, vi } from "vitest";

const { invokeMock } = vi.hoisted(() => ({
  invokeMock: vi.fn(),
}));

vi.mock("../prompt.js", () => ({
  questionGenerationChain: {
    invoke: invokeMock,
  },
}));

import { generateQuestions } from "../generator.js";
import { clearQuestionHistory } from "../history.js";

describe("Question Generator", () => {
  beforeEach(() => {
    invokeMock.mockReset();
    clearQuestionHistory();
  });

  it("generates and validates questions successfully", async () => {
    invokeMock.mockResolvedValue({
      questions: [
        {
          prompt:
            "Explain how a hash table works and how collisions are handled.",
          topic: "Data Structures",
          difficulty: "MEDIUM",
          expectedKeywords: [
            "hashing",
            "collision",
            "hash function",
          ],
          type: "TEXT",
        },
      ],
    });

    const result = await generateQuestions({
      role: "Backend Developer",
      skills: ["Node.js", "TypeScript"],
      difficulty: "MEDIUM",
      type: "TEXT",
      numberOfQuestions: 1,
    });

    expect(result.questions).toHaveLength(1);
    expect(result.questions[0]?.type).toBe("TEXT");
    expect(invokeMock).toHaveBeenCalledTimes(1);
  });

  it("rejects invalid structured output", async () => {
    invokeMock.mockResolvedValue({
      questions: [
        {
          prompt: "Invalid question",
          topic: "Testing",
          difficulty: "INVALID",
          expectedKeywords: [],
          type: "TEXT",
        },
      ],
    });

    await expect(
      generateQuestions({
        role: "Backend Developer",
        skills: ["Node.js"],
        difficulty: "MEDIUM",
        type: "TEXT",
        numberOfQuestions: 1,
      })
    ).rejects.toThrow();
  });

  it("passes the requested parameters to LangChain", async () => {
    invokeMock.mockResolvedValue({
      questions: [
        {
          prompt:
            "Explain how a hash table works and how collisions are handled.",
          topic: "Data Structures",
          difficulty: "MEDIUM",
          expectedKeywords: [
            "hashing",
            "collision",
            "hash function",
          ],
          type: "TEXT",
        },
      ],
    });

    await generateQuestions({
      role: "Backend Developer",
      skills: ["Node.js", "TypeScript"],
      difficulty: "MEDIUM",
      type: "TEXT",
      numberOfQuestions: 1,
    });

    expect(invokeMock).toHaveBeenCalledTimes(1);

    const call = invokeMock.mock.calls[0]?.[0];

    expect(call?.role).toBe("Backend Developer");
    expect(call?.skills).toBe("Node.js, TypeScript");
    expect(call?.difficulty).toBe("MEDIUM");
    expect(call?.type).toBe("TEXT");
    expect(call?.numberOfQuestions).toBe("1");
    expect(call?.previousQuestions).toBe("None");
  });

  it("passes previous questions to LangChain", async () => {
    invokeMock
      .mockResolvedValueOnce({
        questions: [
          {
            prompt:
              "Explain how a hash table works and how collisions are handled.",
            topic: "Data Structures",
            difficulty: "MEDIUM",
            expectedKeywords: [
              "hashing",
              "collision",
              "hash function",
            ],
            type: "TEXT",
          },
        ],
      })
      .mockResolvedValueOnce({
        questions: [
          {
            prompt:
              "Explain how a binary search tree works and how search is performed.",
            topic: "Trees",
            difficulty: "MEDIUM",
            expectedKeywords: [
              "BST",
              "search",
              "tree traversal",
            ],
            type: "TEXT",
          },
        ],
      });

    const request = {
      role: "Backend Developer",
      skills: ["Node.js", "TypeScript"],
      difficulty: "MEDIUM" as const,
      type: "TEXT" as const,
      numberOfQuestions: 1,
    };

    await generateQuestions(request);
    await generateQuestions(request);

    expect(invokeMock).toHaveBeenCalledTimes(2);

    const secondCall = invokeMock.mock.calls[1]?.[0];

    expect(secondCall?.previousQuestions).toContain(
      "Explain how a hash table works and how collisions are handled."
    );

    expect(secondCall?.previousQuestions).not.toBe("None");
  });
});