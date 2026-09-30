import { describe, expect, it, vi } from "vitest";

const { invokeMock } = vi.hoisted(() => ({
  invokeMock: vi.fn(),
}));

vi.mock("../prompt.js", () => ({
  codingEvaluationChain: {
    invoke: invokeMock,
  },
}));

import { evaluateCodingSolution } from "../evaluator.js";

describe("Coding Evaluator", () => {
  it("evaluates a coding solution", async () => {
    invokeMock.mockResolvedValue({
      timeComplexity: "O(n)",
      spaceComplexity: "O(n)",
      codeQualityScore: 90,
      summary: "The solution uses a hash map to efficiently find the complement.",
      suggestions: [
        "Consider adding comments explaining the hash map approach.",
      ],
    });

    const result = await evaluateCodingSolution({
      question:
        "Given an array of integers and a target value, return the indices of two numbers whose sum equals the target.",
      sourceCode: `
        function twoSum(nums, target) {
          const map = new Map();

          for (let i = 0; i < nums.length; i++) {
            const complement = target - nums[i];

            if (map.has(complement)) {
              return [map.get(complement), i];
            }

            map.set(nums[i], i);
          }

          return [];
        }
      `,
      language: "javascript",
      testResults: [
        {
          testCaseId: "1",
          input: "[2,7,11,15], 9",
          expectedOutput: "[0,1]",
          actualOutput: "[0,1]",
          passed: true,
          executionTime: "0.027",
          memory: 7920,
        },
      ],
    });

    expect(result.timeComplexity).toBe("O(n)");
    expect(result.spaceComplexity).toBe("O(n)");
    expect(result.codeQualityScore).toBe(90);
    expect(result.summary).toContain("hash map");
    expect(result.suggestions).toHaveLength(1);
  });

  it("allows an empty suggestions array", async () => {
    invokeMock.mockResolvedValue({
      timeComplexity: "O(1)",
      spaceComplexity: "O(1)",
      codeQualityScore: 100,
      summary: "The implementation is simple and efficient.",
      suggestions: [],
    });

    const result = await evaluateCodingSolution({
      question: "Return the value of a constant.",
      sourceCode: "return 42;",
      language: "javascript",
      testResults: [],
    });

    expect(result.suggestions).toEqual([]);
  });

  it("passes test results to the AI evaluation chain", async () => {
    invokeMock.mockResolvedValue({
      timeComplexity: "O(n)",
      spaceComplexity: "O(n)",
      codeQualityScore: 85,
      summary: "The solution was evaluated using the supplied test results.",
      suggestions: [],
    });

    await evaluateCodingSolution({
      question: "Find two numbers that sum to a target.",
      sourceCode: "function twoSum() {}",
      language: "javascript",
      testResults: [
        {
          testCaseId: "1",
          input: "[2,7], 9",
          expectedOutput: "[0,1]",
          actualOutput: "[0,1]",
          passed: true,
          executionTime: "0.027",
          memory: 7920,
        },
      ],
    });

    expect(invokeMock).toHaveBeenCalledTimes(1);

    const args = invokeMock.mock.calls[0]?.[0];

    expect(args).toMatchObject({
      question: "Find two numbers that sum to a target.",
      language: "javascript",
      sourceCode: "function twoSum() {}",
    });

    expect(args.testResults).toContain('"passed": true');
  });
});