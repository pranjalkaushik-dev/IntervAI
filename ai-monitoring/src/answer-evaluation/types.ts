export type Recommendation =
  | "STRONG_HIRE"
  | "HIRE"
  | "MAYBE"
  | "NO_HIRE"
  | null;

export interface AnswerEvaluationRequest {
  question: string;
  candidateAnswer: string;
  expectedKeywords: string[];
  interviewType: "TEXT" | "MCQ" | "CODING" | "SYSTEM_DESIGN";
}

export interface AnswerEvaluation {
  summary: string;
  strengths: string[];
  improvements: string[];
  technicalScore: number;
  communicationScore: number;
  recommendation: Recommendation;
}