import { evaluateAnswer } from "../answer-evaluation/evaluator.js";
import { generateInterviewAssistantResponse } from "./assistant.js";

import type {
  InterviewAssistantRequest,
  InterviewAssistantResponse,
  InterviewTurn,
} from "./types.js";

import type {
  AnswerEvaluation,
  AnswerEvaluationRequest,
} from "../answer-evaluation/types.js";

export interface AdaptiveInterviewRequest {
  currentQuestion: string;
  candidateAnswer: string;
  expectedKeywords: string[];
  interviewType: "TEXT" | "MCQ" | "CODING" | "SYSTEM_DESIGN";
  difficulty: "EASY" | "MEDIUM" | "HARD";
  previousTurns: InterviewTurn[];
}

export interface AdaptiveInterviewResponse {
  evaluation: AnswerEvaluation;
  assistant: InterviewAssistantResponse;
  updatedTurns: InterviewTurn[];
}

export async function generateAdaptiveInterviewStep(
  request: AdaptiveInterviewRequest
): Promise<AdaptiveInterviewResponse> {
  // 1. Evaluate the candidate's answer.
  const evaluationRequest: AnswerEvaluationRequest = {
    question: request.currentQuestion,
    candidateAnswer: request.candidateAnswer,
    expectedKeywords: request.expectedKeywords,
    interviewType: request.interviewType,
  };

  const evaluation = await evaluateAnswer(evaluationRequest);

  // 2. Add the evaluation to the interview history.
  const currentTurn: InterviewTurn = {
    question: request.currentQuestion,
    candidateAnswer: request.candidateAnswer,
    technicalScore: evaluation.technicalScore,
    communicationScore: evaluation.communicationScore,
    summary: evaluation.summary,
  };

  const updatedTurns: InterviewTurn[] = [
    ...request.previousTurns,
    currentTurn,
  ];

  // 3. Ask the Interview Assistant what should happen next.
  const assistantRequest: InterviewAssistantRequest = {
    currentQuestion: request.currentQuestion,
    candidateAnswer: request.candidateAnswer,
    interviewType: request.interviewType,
    difficulty: request.difficulty,
    previousTurns: updatedTurns,
  };

  const assistant = await generateInterviewAssistantResponse(
    assistantRequest
  );

  return {
    evaluation,
    assistant,
    updatedTurns,
  };
}