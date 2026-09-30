import "dotenv/config";
import http from "node:http";
import { evaluateCodingSolution } from "./coding-evaluation/evaluator.js";
import type { CodingTestResult } from "./coding-evaluation/types.js";
import { generateAdaptiveInterviewStep } from "./interview-assistant/integration.js";
import type { AdaptiveInterviewRequest } from "./interview-assistant/integration.js";
import { geminiConfigured, llm } from "./llm.js";
import { generateQuestions } from "./question-generator/generator.js";
import type { QuestionGenerationRequest } from "./question-generator/types.js";

import { parseResumeTextWithAi } from "./resume-parser/parser.js";
import { evaluateSystemDesignArchitecture } from "./system-design-evaluation/evaluator.js";

const PORT = Number(process.env.AI_MONITORING_PORT || 5050);

interface CodingEvaluationBody {
  question?: string;
  sourceCode?: string;
  language?: string;
  testResults?: CodingTestResult[];
}

interface QuestionGenerationBody {
  role?: string;
  skills?: string[];
  difficulty?: "EASY" | "MEDIUM" | "HARD";
  type?: "TEXT" | "MCQ" | "CODING" | "SYSTEM_DESIGN";
  numberOfQuestions?: number;
  mode?: "DSA" | "CORE_CS" | "PROJECT" | "MIXED";
}

interface InterviewAssistantBody {
  currentQuestion?: string;
  candidateAnswer?: string;
  expectedKeywords?: string[];
  interviewType?: "TEXT" | "MCQ" | "CODING" | "SYSTEM_DESIGN";
  difficulty?: "EASY" | "MEDIUM" | "HARD";
  previousTurns?: AdaptiveInterviewRequest["previousTurns"];
}

const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5179')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

function applyCors(req: http.IncomingMessage, res: http.ServerResponse) {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
}

function sendJson(
  res: http.ServerResponse,
  statusCode: number,
  body: unknown
) {
  const payload = JSON.stringify(body);

  res.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(payload),
  });

  res.end(payload);
}

const server = http.createServer(async (req, res) => {
  applyCors(req, res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === "GET" && req.url === "/health") {
    sendJson(res, 200, {
      success: true,
      service: "ai-monitoring",
      status: "OK",
      geminiConfigured,
    });
    return;
  }

  if (
    req.method !== "POST" ||
    ![
      "/api/ai/coding-evaluation",
      "/api/ai/interview-assistant",
      "/api/ai/generate-questions",
      "/api/ai/final-report",
      "/api/ai/parse-resume",
      "/api/ai/system-design-evaluation",
    ].includes(req.url || "")
  ) {
    sendJson(res, 404, {
      success: false,
      message: "Route not found",
    });
    return;
  }

  try {
    let rawBody = "";

    for await (const chunk of req) {
      rawBody += chunk;
    }

    const body = JSON.parse(rawBody) as
      | CodingEvaluationBody
      | InterviewAssistantBody;

    if (req.url === "/api/ai/parse-resume") {
      const resumeBody = body as { text?: string };
      if (!resumeBody.text?.trim()) {
        sendJson(res, 400, { success: false, message: "text is required for resume parsing" });
        return;
      }
      const parsedData = await parseResumeTextWithAi(resumeBody.text);
      sendJson(res, 200, { success: true, data: { resume: parsedData } });
      return;
    }

    if (req.url === "/api/ai/system-design-evaluation") {
      const designBody = body as {
        questionPrompt?: string;
        nodes?: any[];
        edges?: any[];
        candidateNotes?: string;
      };
      if (!Array.isArray(designBody.nodes)) {
        sendJson(res, 400, { success: false, message: "nodes array is required" });
        return;
      }
      const evaluation = await evaluateSystemDesignArchitecture({
        questionPrompt: designBody.questionPrompt,
        nodes: designBody.nodes,
        edges: designBody.edges || [],
        candidateNotes: designBody.candidateNotes,
      });
      sendJson(res, 200, { success: true, data: { evaluation } });
      return;
    }

    if (req.url === "/api/ai/generate-questions") {
      const questionBody = body as QuestionGenerationBody;
      const allowedTypes = ["TEXT", "MCQ", "CODING", "SYSTEM_DESIGN"];
      const allowedDifficulty = ["EASY", "MEDIUM", "HARD"];
      const count = Math.min(Math.max(Number(questionBody.numberOfQuestions || 1), 1), 10);

      if (!questionBody.role?.trim() || !Array.isArray(questionBody.skills) || questionBody.skills.length === 0) {
        sendJson(res, 400, {
          success: false,
          message: "role and at least one skill are required",
        });
        return;
      }

      if (!allowedTypes.includes(questionBody.type || "") || !allowedDifficulty.includes(questionBody.difficulty || "")) {
        sendJson(res, 400, {
          success: false,
          message: "type and difficulty are invalid",
        });
        return;
      }

      const request: QuestionGenerationRequest = {
        role: questionBody.role.trim(),
        skills: questionBody.skills.map((skill) => String(skill).trim()).filter(Boolean),
        difficulty: questionBody.difficulty!,
        type: questionBody.type!,
        numberOfQuestions: count,
        ...(questionBody.mode ? { mode: questionBody.mode } : {}),
      };

      const generated = await generateQuestions(request);

      sendJson(res, 200, {
        success: true,
        data: generated,
      });
      return;
    }

    if (req.url === "/api/ai/final-report") {
      const finalBody = body as any;
      const prompt = `You are an interview analytics assistant. Produce a concise, factual summary of an interview using only the supplied measurements. Do not make a hiring decision. Mention measured strengths, improvement areas, coding/test performance, communication, technical performance and integrity events. Return JSON with one field: summary.\nData:\n${JSON.stringify(finalBody)}`;
      const response = await llm.invoke(prompt);
      const raw = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
      let summary = raw;
      try { const clean = raw.replace(/^```json\s*/,'').replace(/```$/,'').trim(); summary = JSON.parse(clean).summary || clean; } catch (_) {}
      sendJson(res, 200, { success: true, data: { summary } });
      return;
    }

    if (req.url === "/api/ai/interview-assistant") {
      const assistantBody = body as InterviewAssistantBody;

      if (
        !assistantBody.currentQuestion?.trim() ||
        !assistantBody.candidateAnswer?.trim() ||
        !assistantBody.interviewType ||
        !assistantBody.difficulty ||
        !Array.isArray(assistantBody.expectedKeywords) ||
        !Array.isArray(assistantBody.previousTurns)
      ) {
        sendJson(res, 400, {
          success: false,
          message:
            "currentQuestion, candidateAnswer, expectedKeywords, interviewType, difficulty, and previousTurns are required",
        });
        return;
      }

      const result = await generateAdaptiveInterviewStep({
        currentQuestion: assistantBody.currentQuestion,
        candidateAnswer: assistantBody.candidateAnswer,
        expectedKeywords: assistantBody.expectedKeywords,
        interviewType: assistantBody.interviewType,
        difficulty: assistantBody.difficulty,
        previousTurns: assistantBody.previousTurns,
      });

      sendJson(res, 200, {
        success: true,
        data: result,
      });
      return;
    }

    const codingBody = body as CodingEvaluationBody;

    if (
      !codingBody.question?.trim() ||
      !codingBody.sourceCode?.trim() ||
      !codingBody.language?.trim() ||
      !Array.isArray(codingBody.testResults)
    ) {
      sendJson(res, 400, {
        success: false,
        message:
          "question, sourceCode, language, and testResults are required",
      });
      return;
    }

    const evaluation = await evaluateCodingSolution({
      question: codingBody.question,
      sourceCode: codingBody.sourceCode,
      language: codingBody.language,
      testResults: codingBody.testResults,
    });

    sendJson(res, 200, {
      success: true,
      data: {
        aiFeedback: evaluation,
      },
    });
  } catch (error) {
    console.error("AI evaluation error:", error);

    sendJson(res, 503, {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "AI evaluation failed",
    });
  }
});

server.listen(PORT, () => {
  console.log(
    `AI monitoring server running at http://localhost:${PORT}`
  );
});
