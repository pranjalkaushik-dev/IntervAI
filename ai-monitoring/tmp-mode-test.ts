import { questionGenerationResponseSchema } from "./src/question-generator/schema.js";
import { z } from "zod";

const BASE_URL = process.env.TEST_AI_URL || "http://localhost:5097";

type Case = { label: string; body: Record<string, unknown> };

const cases: Case[] = [
  ...["DSA", "CORE_CS", "PROJECT", "MIXED"].map((mode) => ({
    label: `mode=${mode} type=TEXT`,
    body: {
      role: "Backend Developer",
      skills: ["Node.js", "MongoDB", "System Design"],
      difficulty: "MEDIUM",
      type: "TEXT",
      numberOfQuestions: 1,
      mode,
    },
  })),
  ...["MCQ", "CODING", "SYSTEM_DESIGN"].map((type) => ({
    label: `type=${type} mode=DSA`,
    body: {
      role: "Backend Developer",
      skills: ["Node.js", "MongoDB", "System Design"],
      difficulty: "MEDIUM",
      type,
      numberOfQuestions: 1,
      mode: "DSA",
    },
  })),
];

// Optional filter, e.g. ONLY=MCQ or ONLY=CODING,SYSTEM_DESIGN
const only = process.env.ONLY;
const baseSelected = only
  ? cases.filter((c) => only.split(",").some((needle) => c.label.includes(needle)))
  : cases;

// Optional mode override, e.g. MODE_OVERRIDE=CORE_CS
const modeOverride = process.env.MODE_OVERRIDE;
const selected = modeOverride
  ? baseSelected.map((c) => ({ ...c, body: { ...c.body, mode: modeOverride } }))
  : baseSelected;

let passed = 0;
let failed = 0;

for (const testCase of selected) {
  try {
    const res = await fetch(`${BASE_URL}/api/ai/generate-questions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(testCase.body),
    });

    const json = (await res.json()) as any;

    if (!res.ok || !json.success) {
      failed += 1;
      console.log(`FAIL | ${testCase.label} -> HTTP ${res.status} ${JSON.stringify(json).slice(0, 300)}`);
      continue;
    }

    const questions = json.data?.questions;
    if (!Array.isArray(questions) || questions.length === 0) {
      failed += 1;
      console.log(`FAIL | ${testCase.label} -> no questions`);
      continue;
    }

    // Independently re-validate the Gemini response with the Zod schema.
    const parsed = questionGenerationResponseSchema.safeParse({ questions });
    if (!parsed.success) {
      failed += 1;
      console.log(`FAIL | ${testCase.label} -> Zod validation failed: ${JSON.stringify(parsed.error.issues.slice(0, 3))}`);
      continue;
    }

    const q = questions[0] as any;
    const requestedType = testCase.body.type as string;
    const typeOk = questions.every((item: any) => item.type === requestedType);
    if (!typeOk) {
      failed += 1;
      console.log(`FAIL | ${testCase.label} -> expected all type=${requestedType}, got ${questions.map((i: any) => i.type).join(",")}`);
      continue;
    }

    passed += 1;
    console.log(
      `PASS | ${testCase.label} -> ${questions.length} question(s), type=${q.type}, topic=${String(q.topic).slice(0, 50)}`
    );
    console.log(`       prompt: ${String(q.prompt).replace(/\s+/g, " ").slice(0, 150)}`);
  } catch (error: any) {
    failed += 1;
    console.log(`FAIL | ${testCase.label} -> ${error?.message}`);
  }
}

console.log(`\nRESULT: passed=${passed} failed=${failed}`);
console.log(`GEMINI_VERSIONED_SCHEMA_OK=${failed === 0 ? "true" : "false"}`);
process.exit(failed === 0 ? 0 : 1);
