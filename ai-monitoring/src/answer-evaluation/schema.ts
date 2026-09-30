import { z } from "zod";

export const answerEvaluationSchema = z.object({
  summary: z.string().min(1),

  strengths: z
    .array(z.string().min(1))
    .min(1),

  improvements: z
    .array(z.string().min(1))
    .min(1),

  technicalScore: z
    .number()
    .min(0)
    .max(100),

  communicationScore: z
    .number()
    .min(0)
    .max(100),

  recommendation: z.enum([
    "STRONG_HIRE",
    "HIRE",
    "MAYBE",
    "NO_HIRE",
  ]).nullable(),
});

export const answerEvaluationJsonSchema =
  z.toJSONSchema(answerEvaluationSchema);