import type { CodingSubmissionPayload } from "./submission-adapter.js";

export interface CodingSubmissionResponse {
  success: boolean;
  message: string;
  data?: {
    submissionId: string;
    interviewId: string;
    questionId: string | null;
    studentId: string;
    sourceCode: string;
    languageId: number;
    status: "PASSED" | "FAILED" | "PARTIAL" | "ERROR";
    score: number;
    testResults: CodingSubmissionPayload["testResults"];
    aiFeedback: CodingSubmissionPayload["aiFeedback"];
    submittedAt: string;
  };
}

export interface SubmitCodingSolutionOptions {
  baseUrl: string;
  token: string;
  payload: CodingSubmissionPayload;
}

export async function submitCodingSolution({
  baseUrl,
  token,
  payload,
}: SubmitCodingSolutionOptions): Promise<CodingSubmissionResponse> {
  const response = await fetch(
    `${baseUrl.replace(/\/$/, "")}/api/coding/submit`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    }
  );

  const result = (await response.json()) as CodingSubmissionResponse;

  if (!response.ok || !result.success) {
    throw new Error(result.message || "Coding submission failed");
  }

  return result;
}
