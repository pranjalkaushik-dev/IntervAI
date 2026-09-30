import { z } from "zod";

export const interviewAssistantSchema = z.object({
  action: z.enum(["FOLLOW_UP", "NEXT_QUESTION"]),

  message: z
    .string()
    .min(1, "Message must not be empty"),

  nextQuestion: z
    .string()
    .min(1, "Next question must not be empty"),

  reason: z
    .string()
    .min(1, "Reason must not be empty"),

  nextDifficulty: z.enum(["EASY", "MEDIUM", "HARD"]).default("MEDIUM"),
});

export const interviewAssistantJsonSchema =
  z.toJSONSchema(interviewAssistantSchema);