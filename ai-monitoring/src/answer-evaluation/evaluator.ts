import { answerEvaluationChain } from "./prompt.js";
import { answerEvaluationSchema } from "./schema.js";
import { withRetry } from "../question-generator/retry.js";

import type {
  AnswerEvaluation,
  AnswerEvaluationRequest,
} from "./types.js";

export async function evaluateAnswer(
  request: AnswerEvaluationRequest
): Promise<AnswerEvaluation> {
  const response = await withRetry(() =>
    answerEvaluationChain.invoke({
      question: request.question,
      candidateAnswer: request.candidateAnswer,
      expectedKeywords: request.expectedKeywords.join(", "),
      interviewType: request.interviewType,
    })
  );

  return answerEvaluationSchema.parse(response);
}