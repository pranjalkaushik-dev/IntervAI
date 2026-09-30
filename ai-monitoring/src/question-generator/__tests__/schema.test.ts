import { describe, expect, it } from "vitest";
import { questionGenerationResponseSchema } from "../schema.js";

describe("Question Generation Schema", () => {
  it("accepts a valid TEXT question", () => {
    const result = questionGenerationResponseSchema.safeParse({
      questions: [
        {
          prompt: "Explain the difference between let, const, and var.",
          topic: "JavaScript",
          difficulty: "EASY",
          expectedKeywords: ["scope", "hoisting", "reassignment"],
          type: "TEXT",
        },
      ],
    });

    expect(result.success).toBe(true);
  });

  it("accepts a valid MCQ question", () => {
    const result = questionGenerationResponseSchema.safeParse({
      questions: [
        {
          prompt: "Which data structure follows LIFO?",
          topic: "Data Structures",
          difficulty: "EASY",
          expectedKeywords: ["stack", "LIFO"],
          type: "MCQ",
          options: [
            "Queue",
            "Stack",
            "Array",
            "Linked List",
          ],
          correctOptionIndex: 1,
        },
      ],
    });

    expect(result.success).toBe(true);
  });

  it("accepts a valid CODING question", () => {
    const result = questionGenerationResponseSchema.safeParse({
      questions: [
        {
          prompt:
            "Find the maximum sum of a contiguous subarray of size k.",
          topic: "Sliding Window",
          difficulty: "MEDIUM",
          expectedKeywords: [
            "sliding window",
            "subarray",
            "linear scan",
          ],
          type: "CODING",
          constraints: [
            "1 <= k <= nums.length <= 100000",
          ],
          examples: [
            {
              input: "nums = [1,2,3,4], k = 2",
              output: "7",
            },
          ],
          testCases: [
            {
              input: "nums = [1,2,3], k = 2",
              expectedOutput: "5",
            },
            {
              input: "nums = [-1,-2,-3], k = 2",
              expectedOutput: "-3",
            },
            {
              input: "nums = [5], k = 1",
              expectedOutput: "5",
            },
          ],
        },
      ],
    });

    expect(result.success).toBe(true);
  });

  it("rejects an invalid question type", () => {
    const result = questionGenerationResponseSchema.safeParse({
      questions: [
        {
          prompt: "Some question",
          topic: "Testing",
          difficulty: "MEDIUM",
          expectedKeywords: ["testing"],
          type: "INVALID",
        },
      ],
    });

    expect(result.success).toBe(false);
  });

  it("rejects an MCQ with fewer than 4 options", () => {
    const result = questionGenerationResponseSchema.safeParse({
      questions: [
        {
          prompt: "Which one is a programming language?",
          topic: "Programming",
          difficulty: "EASY",
          expectedKeywords: ["programming language"],
          type: "MCQ",
          options: ["JavaScript", "HTML", "CSS"],
          correctOptionIndex: 0,
        },
      ],
    });

    expect(result.success).toBe(false);
  });
});