import { toJsonSchema } from "@langchain/core/utils/json_schema";
import { z } from "zod";
import { questionGenerationResponseSchema } from "./src/question-generator/schema.js";
import { geminiQuestionGenerationSchema } from "./src/question-generator/gemini-schema.js";
import { schemaToGenerativeAIParameters } from "./node_modules/@langchain/google-genai/dist/utils/zod_to_genai_parameters.js";
import { writeFileSync } from "node:fs";

function scan(obj: any, path: string, out: string[]): void {
  if (obj && typeof obj === "object") {
    for (const [k, v] of Object.entries(obj)) {
      if (k === "const") out.push(`  const  @ ${path} = ${JSON.stringify(v)}`);
      if (k === "oneOf") out.push(`  oneOf  @ ${path}`);
      if (k === "anyOf") out.push(`  anyOf  @ ${path}`);
      if (k === "enum") out.push(`  enum   @ ${path} = ${JSON.stringify(v)}`);
      if (k === "pattern") out.push(`  pattern@ ${path} = ${JSON.stringify(v)}`);
      if (k === "minLength" || k === "maxLength" || k === "minimum" || k === "maximum" || k === "minItems" || k === "maxItems")
        out.push(`  ${k} @ ${path} = ${JSON.stringify(v)}`);
      scan(v, `${path}.${k}`, out);
    }
  }
}

const a = toJsonSchema(questionGenerationResponseSchema);
const b = schemaToGenerativeAIParameters(questionGenerationResponseSchema);
const c = z.toJSONSchema(questionGenerationResponseSchema);

console.log("=== A) @langchain/core toJsonSchema (raw) ===");
const outA: string[] = [];
scan(a, "$", outA);
console.log(outA.join("\n"));

console.log("\n=== B) schemaToGenerativeAIParameters -> responseSchema actually sent ===");
const outB: string[] = [];
scan(b, "$", outB);
console.log(outB.join("\n"));

console.log("\n=== C) z.toJSONSchema ===");
const outC: string[] = [];
scan(c, "$", outC);
console.log(outC.join("\n"));

writeFileSync("/tmp/qgen-langchain.json", JSON.stringify(b, null, 2));
writeFileSync("/tmp/qgen-zod.json", JSON.stringify(c, null, 2));

console.log("\n=== D) geminiQuestionGenerationSchema (NEW - what we now send) ===");
const outD: string[] = [];
scan(geminiQuestionGenerationSchema, "$", outD);
console.log(outD.length ? outD.join("\n") : "  (no const/oneOf/enum issues printed)");
console.log("  const count:", JSON.stringify(geminiQuestionGenerationSchema).includes('"const"'));
console.log("  oneOf count:", JSON.stringify(geminiQuestionGenerationSchema).includes('"oneOf"'));
console.log("  anyOf count:", JSON.stringify(geminiQuestionGenerationSchema).includes('"anyOf"'));

writeFileSync("/tmp/qgen-gemini-new.json", JSON.stringify(geminiQuestionGenerationSchema, null, 2));
console.log("\nwrote /tmp/qgen-langchain.json, /tmp/qgen-zod.json and /tmp/qgen-gemini-new.json");
