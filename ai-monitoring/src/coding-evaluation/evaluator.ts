import { codingEvaluationChain } from "./prompt.js";
import { codingEvaluationSchema } from "./schema.js";
import { withRetry } from "../question-generator/retry.js";
import type {
  CodingEvaluation,
  CodingEvaluationRequest,
} from "./types.js";

function normalizeNullableValue(
  value: string
): string | null {
  return value === "Unable to determine reliably"
    ? null
    : value;
}

export async function evaluateCodingSolution(
  request: CodingEvaluationRequest
): Promise<CodingEvaluation> {
  const response = (await withRetry(() =>
    codingEvaluationChain.invoke({
      question: request.question,
      language: request.language,
      sourceCode: request.sourceCode,
      testResults: JSON.stringify(request.testResults, null, 2),
    })
  )) as Record<string, any>;

  const normalized = {
    ...response,
    timeComplexity: normalizeNullableValue(
      response.timeComplexity
    ),
    spaceComplexity: normalizeNullableValue(
      response.spaceComplexity
    ),
  };

  return codingEvaluationSchema.parse(normalized);
}