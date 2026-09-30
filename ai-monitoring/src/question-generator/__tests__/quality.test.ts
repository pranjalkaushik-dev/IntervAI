import { describe, expect, it } from "vitest";
import { validateQuestionQuality } from "../quality.js";

describe("Question Quality Validation", () => {
  it("accepts valid TEXT questions", () => {
    const questions = [
      {
        prompt:
          "Explain the difference between let, const, and var in JavaScript.",
        topic: "JavaScript",
        difficulty: "EASY" as const,
        expectedKeywords: ["scope", "hoisting", "reassignment"],
        type: "TEXT" as const,
      },
    ];

    expect(() => {
      validateQuestionQuality(questions, 1);
    }).not.toThrow();
  });

  it("rejects when the question count is incorrect", () => {
    const questions = [
      {
        prompt:
          "Explain the difference between let, const, and var in JavaScript.",
        topic: "JavaScript",
        difficulty: "EASY" as const,
        expectedKeywords: ["scope", "hoisting"],
        type: "TEXT" as const,
      },
    ];

    expect(() => {
      validateQuestionQuality(questions, 2);
    }).toThrow("Expected 2 questions, but received 1");
  });

  it("rejects questions that are too short", () => {
    const questions = [
      {
        prompt: "What is Node?",
        topic: "Node.js",
        difficulty: "EASY" as const,
        expectedKeywords: ["Node.js"],
        type: "TEXT" as const,
      },
    ];

    expect(() => {
      validateQuestionQuality(questions, 1);
    }).toThrow();
  });

  it("rejects duplicate questions", () => {
    const questions = [
      {
        prompt:
          "Explain how a JavaScript closure works and give a practical example.",
        topic: "JavaScript",
        difficulty: "MEDIUM" as const,
        expectedKeywords: ["closure", "scope"],
        type: "TEXT" as const,
      },
      {
        prompt:
          "Explain how a JavaScript closure works and give a practical example.",
        topic: "JavaScript",
        difficulty: "MEDIUM" as const,
        expectedKeywords: ["closure", "scope"],
        type: "TEXT" as const,
      },
    ];

    expect(() => {
      validateQuestionQuality(questions, 2);
    }).toThrow("Duplicate question detected at position 2");
  });

  it("rejects questions without expected keywords", () => {
    const questions = [
      {
        prompt:
          "Explain how indexing improves query performance in a database.",
        topic: "Databases",
        difficulty: "MEDIUM" as const,
        expectedKeywords: [],
        type: "TEXT" as const,
      },
    ];

    expect(() => {
      validateQuestionQuality(questions, 1);
    }).toThrow("must contain expected keywords");
  });

  it("accepts a valid MCQ question", () => {
    const questions = [
      {
        prompt:
          "Which data structure follows the Last In First Out principle?",
        topic: "Data Structures",
        difficulty: "EASY" as const,
        expectedKeywords: ["stack", "LIFO"],
        type: "MCQ" as const,
        options: [
          "Queue",
          "Stack",
          "Linked List",
          "Binary Tree",
        ],
        correctOptionIndex: 1,
      },
    ];

    expect(() => {
      validateQuestionQuality(questions, 1);
    }).not.toThrow();
  });

  it("rejects an MCQ with duplicate options", () => {
    const questions = [
      {
        prompt:
          "Which data structure follows the Last In First Out principle?",
        topic: "Data Structures",
        difficulty: "EASY" as const,
        expectedKeywords: ["stack", "LIFO"],
        type: "MCQ" as const,
        options: [
          "Queue",
          "Stack",
          "Stack",
          "Binary Tree",
        ],
        correctOptionIndex: 1,
      },
    ];

    expect(() => {
      validateQuestionQuality(questions, 1);
    }).toThrow("contains duplicate options");
  });

  it("rejects a coding question with fewer than 3 test cases", () => {
    const questions = [
      {
        prompt:
          "Find the maximum sum of a contiguous subarray of size k using an efficient algorithm.",
        topic: "Sliding Window",
        difficulty: "MEDIUM" as const,
        expectedKeywords: [
          "sliding window",
          "subarray",
          "linear scan",
        ],
        type: "CODING" as const,
        constraints: [
          "1 <= k <= nums.length <= 100000",
        ],
        examples: [
          {
            input: "nums = [1,2,3], k = 2",
            output: "5",
          },
        ],
        testCases: [
          {
            input: "nums = [1,2,3], k = 2",
            expectedOutput: "5",
          },
          {
            input: "nums = [-1,-2], k = 1",
            expectedOutput: "-1",
          },
        ],
      },
    ];

    expect(() => {
      validateQuestionQuality(questions, 1);
    }).toThrow("must contain at least 3 test cases");
  });

  it("accepts a valid coding question", () => {
    const questions = [
      {
        prompt:
          "Find the maximum sum of a contiguous subarray of size k using an efficient algorithm.",
        topic: "Sliding Window",
        difficulty: "MEDIUM" as const,
        expectedKeywords: [
          "sliding window",
          "subarray",
          "linear scan",
        ],
        type: "CODING" as const,
        constraints: [
          "1 <= k <= nums.length <= 100000",
        ],
        examples: [
          {
            input: "nums = [1,2,3], k = 2",
            output: "5",
          },
        ],
        testCases: [
          {
            input: "nums = [1,2,3], k = 2",
            expectedOutput: "5",
          },
          {
            input: "nums = [-1,-2], k = 1",
            expectedOutput: "-1",
          },
          {
            input: "nums = [5], k = 1",
            expectedOutput: "5",
          },
        ],
      },
    ];

    expect(() => {
      validateQuestionQuality(questions, 1);
    }).not.toThrow();
  });
});