import { questionGenerationJsonSchema } from "./schema.js";

/**
 * Gemini-compatible copy of the question-generation response schema.
 *
 * The application schema stays in `schema.ts` (Zod, source of truth for
 * validation). This file only rewrites the *request-side* JSON schema that is
 * handed to LangChain and sent to Gemini as `generation_config.responseSchema`.
 *
 * Gemini's `Schema` message is an OpenAPI subset and rejects keywords that Zod
 * emits for this schema:
 *   - `const`  <- `z.literal("TEXT" | "MCQ" | "CODING" | "SYSTEM_DESIGN")`
 *                => HTTP 400: Unknown name "const" at
 *                   generation_config.response_schema...one_of[n].properties[4]
 *   - `oneOf`  <- `z.discriminatedUnion("type", [...])`; Gemini documents
 *                `anyOf` as the supported union construct.
 *
 * Rewriting `const` to a one-value `enum` keeps the exact same constraint for
 * the model: it still has to answer with one of the four question types.
 */
type JsonSchemaNode = Record<string, unknown>;

/** Keywords valid in JSON Schema but unknown to Gemini's `Schema` message. */
const GEMINI_UNSUPPORTED_KEYS = new Set([
  "$schema",
  "$id",
  "$ref",
  "$defs",
  "definitions",
  "additionalProperties",
  "unevaluatedProperties",
  "strict",
]);

function toGeminiNode(node: unknown): unknown {
  if (Array.isArray(node)) {
    return node.map(toGeminiNode);
  }

  if (node === null || typeof node !== "object") {
    return node;
  }

  const source = node as JsonSchemaNode;
  const converted: JsonSchemaNode = {};

  for (const [key, value] of Object.entries(source)) {
    if (GEMINI_UNSUPPORTED_KEYS.has(key)) {
      continue;
    }

    if (key === "const") {
      if (!("enum" in converted)) {
        converted.enum = [value];
      }
      continue;
    }

    if (key === "oneOf") {
      converted.anyOf = toGeminiNode(value);
      continue;
    }

    converted[key] = toGeminiNode(value);
  }

  return converted;
}

/**
 * Schema sent to Gemini as `generation_config.responseSchema`.
 * The JSON returned by Gemini is validated afterwards by
 * `questionGenerationResponseSchema.parse()` in `generator.ts`.
 */
export const geminiQuestionGenerationSchema = toGeminiNode(
  questionGenerationJsonSchema
) as JsonSchemaNode;
