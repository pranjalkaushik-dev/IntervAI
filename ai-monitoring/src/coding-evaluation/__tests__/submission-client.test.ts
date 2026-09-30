import { describe, expect, it, vi, afterEach } from "vitest";
import { submitCodingSolution } from "../submission-client.js";

describe("Coding Submission Client", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const payload = {
    interviewId: "interview-123",
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
      },
    ],
    aiFeedback: {
      timeComplexity: "O(1)",
      spaceComplexity: "O(1)",
      codeQualityScore: 90,
      summary: "Good solution.",
      suggestions: ["Improve naming."],
    },
  };

  it("submits a coding solution successfully", async () => {
    const responseBody = {
      success: true,
      message: "Code submission saved successfully",
      data: {
        submissionId: "submission-123",
        interviewId: "interview-123",
        questionId: null,
        studentId: "student-123",
        sourceCode: payload.sourceCode,
        languageId: 63,
        status: "PASSED",
        score: 100,
        testResults: payload.testResults,
        aiFeedback: payload.aiFeedback,
        submittedAt: "2026-09-07T18:00:00.000Z",
      },
    };

    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(JSON.stringify(responseBody), {
          status: 201,
          headers: {
            "Content-Type": "application/json",
          },
        })
      );

    const result = await submitCodingSolution({
      baseUrl: "http://localhost:5001",
      token: "test-jwt-token",
      payload,
    });

    expect(result).toEqual(responseBody);

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:5001/api/coding/submit",
      expect.objectContaining({
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer test-jwt-token",
        },
        body: JSON.stringify(payload),
      })
    );
  });

  it("removes a trailing slash from the base URL", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          message: "Code submission saved successfully",
        }),
        {
          status: 201,
          headers: {
            "Content-Type": "application/json",
          },
        }
      )
    );

    await submitCodingSolution({
      baseUrl: "http://localhost:5001/",
      token: "token",
      payload,
    });

    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:5001/api/coding/submit",
      expect.any(Object)
    );
  });

  it("throws when the backend returns an error", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          success: false,
          message: "Unauthorized",
        }),
        {
          status: 401,
          headers: {
            "Content-Type": "application/json",
          },
        }
      )
    );

    await expect(
      submitCodingSolution({
        baseUrl: "http://localhost:5001",
        token: "invalid-token",
        payload,
      })
    ).rejects.toThrow("Unauthorized");
  });
});
