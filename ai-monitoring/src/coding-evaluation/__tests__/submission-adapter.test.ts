import { describe, expect, it } from "vitest";
import { createCodingSubmissionPayload } from "../submission-adapter.js";

describe("Coding Submission Adapter", () => {
  it("maps coding evaluation to the backend aiFeedback shape", () => {
    const payload = createCodingSubmissionPayload(
      {
        interviewId: "interview-123",
        questionId: "question-123",
        sourceCode: "console.log('hello');",
        languageId: 63,
        languageName: "javascript",
        testResults: [
          {
            testCaseId: "1",
            input: "",
            expectedOutput: "hello",
            actualOutput: "hello",
            passed: true,
            executionTime: "0.027",
            memory: 8136,
          },
        ],
      },
      {
        timeComplexity: "O(1)",
        spaceComplexity: "O(1)",
        codeQualityScore: 90,
        summary: "The solution is simple and readable.",
        suggestions: ["Use a more descriptive variable name."],
      }
    );

    expect(payload.aiFeedback).toEqual({
      timeComplexity: "O(1)",
      spaceComplexity: "O(1)",
      codeQualityScore: 90,
      summary: "The solution is simple and readable.",
      suggestions: ["Use a more descriptive variable name."],
    });
  });

  it("preserves execution results and submission metadata", () => {
    const testResults = [
      {
        testCaseId: "1",
        input: "[1, 2, 3]",
        expectedOutput: "3",
        actualOutput: "3",
        passed: true,
      },
      {
        testCaseId: "2",
        input: "[]",
        expectedOutput: "0",
        actualOutput: "0",
        passed: true,
      },
    ];

    const payload = createCodingSubmissionPayload(
      {
        interviewId: "interview-456",
        sourceCode: "console.log(3);",
        languageId: 63,
        languageName: "javascript",
        testResults,
      },
      {
        timeComplexity: null,
        spaceComplexity: null,
        codeQualityScore: null,
        summary: null,
        suggestions: [],
      }
    );

    expect(payload.interviewId).toBe("interview-456");
    expect(payload.sourceCode).toBe("console.log(3);");
    expect(payload.languageId).toBe(63);
    expect(payload.languageName).toBe("javascript");
    expect(payload.testResults).toEqual(testResults);
  });

  it("does not alter the evaluation values", () => {
    const evaluation = {
      timeComplexity: "O(n log n)",
      spaceComplexity: "O(n)",
      codeQualityScore: 75,
      summary: "Works correctly but can be simplified.",
      suggestions: ["Reduce unnecessary intermediate storage."],
    };

    const payload = createCodingSubmissionPayload(
      {
        interviewId: "interview-789",
        sourceCode: "const result = [];",
        languageId: 71,
        languageName: "python",
        testResults: [],
      },
      evaluation
    );

    expect(payload.aiFeedback).toEqual(evaluation);
  });
});
