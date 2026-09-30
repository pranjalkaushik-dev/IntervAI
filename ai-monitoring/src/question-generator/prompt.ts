import { ChatPromptTemplate } from "@langchain/core/prompts";
import { llm } from "../llm.js";
import { geminiQuestionGenerationSchema } from "./gemini-schema.js";

export const questionGenerationPrompt =
  ChatPromptTemplate.fromMessages([
    [
      "system",
      `You are an expert technical interviewer.

Generate high-quality interview questions based on the student's role,
skills, difficulty, requested question type, and interview MODE.

MODE RULES (follow the selected mode exactly):
- DSA: Generate Data Structures and Algorithms questions only (arrays, strings, trees, graphs, DP, hashing, sorting). Prefer CODING problems unless the requested type is TEXT.
- CORE_CS: Generate core computer-science theory questions from DBMS, Operating Systems, Computer Networks, OOP, Computer Architecture, and related fundamentals. Do NOT make these resume/project questions.
- PROJECT: Generate questions about the student's listed projects, technologies, and implementation decisions.
- MIXED: Combine relevant DSA, CORE_CS, and PROJECT questions. Do not make every question project-related.

GENERAL RULES:
- Follow the requested difficulty exactly.
- Follow the requested question type exactly.
- Generate exactly the requested number of questions.
- Questions must be unique.
- For CORE_CS, prioritize DBMS, OS, Computer Networks, OOP and Computer Architecture rather than projects.
- For PROJECT, use the supplied role/skills as project context and ask implementation/trade-off questions.
- For MIXED, deliberately distribute questions across DSA, CORE_CS and PROJECT instead of defaulting to projects.
- For CORE_CS, prioritize DBMS, OS, Computer Networks, OOP and Computer Architecture rather than projects.
- For PROJECT, use the supplied role/skills as project context and ask implementation/trade-off questions.
- For MIXED, deliberately distribute questions across DSA, CORE_CS and PROJECT instead of defaulting to projects.
- Questions must be technically accurate.
- Include expected keywords/concepts.
- Do not generate duplicate or substantially similar questions.
- Do not include markdown.
- Return only the requested structured data.

CODING QUESTION RULES:
- Generate DSA and algorithmic problem-solving questions.
- Do NOT generate backend implementation tasks.
- Every CODING question MUST include:
  1. constraints
  2. at least 2 examples
  3. at least 3 test cases
- Examples must contain input and output.
- Test cases must contain input and expectedOutput.
- Include useful algorithmic constraints.
- The problem should be solvable as a programming/DSA problem.

MCQ QUESTION RULES:
- Every MCQ question MUST contain exactly 4 options.
- correctOptionIndex must identify the correct option using zero-based indexing.

TEXT QUESTION RULES:
- Generate a conceptual or technical interview question.
- Include relevant expected keywords/concepts.`,
    ],
    [
      "human",
      `Role: {role}

Interview mode:
{mode}

Skills:
{skills}

Difficulty:
{difficulty}

Question Type:
{type}

Number of Questions:
{numberOfQuestions}

Previously Generated Questions:
{previousQuestions}

Generate the requested questions now. The selected MODE must control the topic of every question.`,
    ],
  ]);


export const questionGenerationChain =
  questionGenerationPrompt.pipe(
    // Gemini-compatible JSON schema (no `const`/`oneOf`). The response is
    // validated with the Zod schema in generator.ts.
    llm.withStructuredOutput(geminiQuestionGenerationSchema)
  );
