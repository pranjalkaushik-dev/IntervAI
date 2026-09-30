import { questionGenerationChain } from "./prompt.js";
import { questionGenerationResponseSchema } from "./schema.js";
import { validateQuestionQuality } from "./quality.js";
import { withRetry } from "./retry.js";
import {
  addQuestionsToHistory,
  getQuestionHistory,
} from "./history.js";

import type {
  QuestionGenerationRequest,
  QuestionGenerationResponse,
} from "./types.js";

export async function generateQuestions(
  request: QuestionGenerationRequest
): Promise<QuestionGenerationResponse> {
  const previousQuestions = getQuestionHistory();

  const previousQuestionsText =
    previousQuestions.length > 0
      ? previousQuestions
          .map((question, index) =>
            `${index + 1}. ${question.prompt}`
          )
          .join("\n")
      : "None";

  const response = await withRetry(() =>
    questionGenerationChain.invoke({
      role: request.role,
      mode: request.mode || "MIXED",
      skills: request.skills.join(", "),
      difficulty: request.difficulty,
      type: request.type,
      numberOfQuestions: String(request.numberOfQuestions),
      previousQuestions: previousQuestionsText,
    })
  );

  const validated =
    questionGenerationResponseSchema.parse(response);

  validateQuestionQuality(
    validated.questions,
    request.numberOfQuestions
  );

  addQuestionsToHistory(validated.questions);

  return validated;
}