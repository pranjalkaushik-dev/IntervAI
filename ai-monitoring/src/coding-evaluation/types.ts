export interface CodingTestResult {
  testCaseId?: string | null;
  input: string;
  expectedOutput: string;
  actualOutput: string;
  passed: boolean;
  executionTime?: string;
  memory?: number;
  error?: string;
}

export interface CodingEvaluationRequest {
  question: string;
  sourceCode: string;
  language: string;
  testResults: CodingTestResult[];
}

export interface CodingEvaluation {
  timeComplexity: string | null;
  spaceComplexity: string | null;
  codeQualityScore: number | null;
  summary: string | null;
  suggestions: string[];
}