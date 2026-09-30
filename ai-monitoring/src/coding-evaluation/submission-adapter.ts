import type { CodingEvaluation } from "./types.js";

export interface CodingSubmissionPayload {
  interviewId: string;
  questionId?: string;
  sourceCode: string;
  languageId: number;
  languageName: string;
  testResults: Array<{
    testCaseId?: string | null;
    input: string;
    expectedOutput: string;
    actualOutput: string;
    passed: boolean;
    executionTime?: string;
    memory?: number;
    error?: string;
  }>;
  aiFeedback: {
    timeComplexity: string | null;
    spaceComplexity: string | null;
    codeQualityScore: number | null;
    summary: string | null;
    suggestions: string[];
  };
}

export function createCodingSubmissionPayload(
  input: Omit<CodingSubmissionPayload, "aiFeedback">,
  evaluation: CodingEvaluation
): CodingSubmissionPayload {
  return {
    ...input,
    aiFeedback: {
      timeComplexity: evaluation.timeComplexity,
      spaceComplexity: evaluation.spaceComplexity,
      codeQualityScore: evaluation.codeQualityScore,
      summary: evaluation.summary,
      suggestions: evaluation.suggestions,
    },
  };
}
