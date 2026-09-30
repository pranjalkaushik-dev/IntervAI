import { interviewAssistantChain } from "./prompt.js";
import { interviewAssistantSchema } from "./schema.js";
import type {
  InterviewAssistantRequest,
  InterviewAssistantResponse,
} from "./types.js";
import { withRetry } from "../question-generator/retry.js";

export async function generateInterviewAssistantResponse(
  request: InterviewAssistantRequest
): Promise<InterviewAssistantResponse> {
  if (!request.currentQuestion.trim()) {
    throw new Error("Current question must not be empty");
  }

  if (!request.candidateAnswer.trim()) {
    throw new Error("Candidate answer must not be empty");
  }

  const result = await withRetry(() =>
    interviewAssistantChain.invoke({
      interviewType: request.interviewType,
      difficulty: request.difficulty,
      currentQuestion: request.currentQuestion,
      candidateAnswer: request.candidateAnswer,
      previousTurns: JSON.stringify(request.previousTurns),
    })
  );

  return interviewAssistantSchema.parse(result);
}