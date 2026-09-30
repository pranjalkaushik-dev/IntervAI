export type InterviewAssistantAction =
  | "FOLLOW_UP"
  | "NEXT_QUESTION";

export interface InterviewTurn {
  question: string;
  candidateAnswer: string;
  technicalScore?: number;
  communicationScore?: number;
  summary?: string;
}

export interface InterviewAssistantRequest {
  currentQuestion: string;
  candidateAnswer: string;
  interviewType: "TEXT" | "MCQ" | "CODING" | "SYSTEM_DESIGN";
  difficulty: "EASY" | "MEDIUM" | "HARD";
  previousTurns: InterviewTurn[];
}

export interface InterviewAssistantResponse {
  action: InterviewAssistantAction;
  message: string;
  nextQuestion: string;
  reason: string;
  nextDifficulty: "EASY" | "MEDIUM" | "HARD";
}
