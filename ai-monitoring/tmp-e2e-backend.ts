import { questionGenerationResponseSchema } from "./src/question-generator/schema.js";

const SERVER_URL = process.env.TEST_SERVER_URL || "http://localhost:5000";

async function req(url: string, init?: RequestInit) {
  const response = await fetch(url, init);
  let body: any = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  return { response, body };
}

async function main() {
  const email = `e2e-gemini-${Date.now()}@example.com`;

  const reg = await req(`${SERVER_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fullName: "E2E Gemini Student",
      email,
      password: "RegressionPassword!123",
      accountRole: "STUDENT",
    }),
  });

  let token: string | undefined = reg.body?.data?.token;
  if (!token) {
    const login = await req(`${SERVER_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: "RegressionPassword!123" }),
    });
    token = login.body?.data?.token;
  }

  if (!token) {
    console.log("FAIL: could not authenticate", JSON.stringify(reg.body).slice(0, 300));
    process.exit(1);
  }

  console.log(`authenticated as ${email}\n`);

  let realCount = 0;
  let fallbackCount = 0;
  let failed = 0;

  for (const mode of ["DSA", "CORE_CS", "PROJECT", "MIXED"]) {
    const res = await req(`${SERVER_URL}/api/interviews/mock`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ mode, numberOfQuestions: 2 }),
    });

    const message: string = res.body?.message || "";
    const questions = res.body?.data?.questions;
    const isFallback = message.includes("fallback");

    if (!res.response.ok || !Array.isArray(questions) || questions.length === 0) {
      failed += 1;
      console.log(`FAIL    | ${mode} -> HTTP ${res.response.status} ${message.slice(0, 200)}`);
      continue;
    }

    const parsed = questionGenerationResponseSchema.safeParse({ questions });
    if (!parsed.success) {
      failed += 1;
      console.log(`FAIL    | ${mode} -> Zod validation failed: ${JSON.stringify(parsed.error.issues.slice(0, 2))}`);
      continue;
    }

    if (res.body?.data?.mockMode !== mode) {
      failed += 1;
      console.log(`FAIL    | ${mode} -> mockMode not preserved: ${res.body?.data?.mockMode}`);
      continue;
    }

    if (isFallback) {
      fallbackCount += 1;
      console.log(`FALLBACK| ${mode} -> ${questions.length} questions (AI generation failed -> fallback used)`);
      continue;
    }

    realCount += 1;
    console.log(`REAL    | ${mode} -> ${questions.length} questions, mode=${res.body?.data?.mockMode}, message="${message}"`);
    for (const q of questions as any[]) {
      console.log(`            [${q.type}] ${String(q.prompt).replace(/\s+/g, " ").slice(0, 120)}`);
    }
  }

  console.log(`\nREAL_GEMINI=${realCount} FALLBACK=${fallbackCount} FAILED=${failed}`);
  console.log(`message on success must be exactly: "Mock interview created successfully"`);
  process.exit(failed === 0 && realCount === 4 ? 0 : 1);
}

main();
