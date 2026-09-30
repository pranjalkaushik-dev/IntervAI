export type InterviewType =
  | "CODING"
  | "MCQ"
  | "TEXT"
  | "SYSTEM_DESIGN";

export type Difficulty =
  | "EASY"
  | "MEDIUM"
  | "HARD";

export type MockInterviewMode = "DSA" | "CORE_CS" | "PROJECT" | "MIXED";

export interface QuestionGenerationRequest {
  role: string;
  skills: string[];
  difficulty: Difficulty;
  type: InterviewType;
  numberOfQuestions: number;
  mode?: MockInterviewMode;
}

export interface BaseGeneratedQuestion {
  prompt: string;
  topic: string;
  difficulty: Difficulty;
  expectedKeywords: string[];
}

export interface TextQuestion extends BaseGeneratedQuestion {
  type: "TEXT";
}

export interface SystemDesignQuestion extends BaseGeneratedQuestion {
  type: "SYSTEM_DESIGN";
}

export interface McqQuestion extends BaseGeneratedQuestion {
  type: "MCQ";
  options: string[];
  correctOptionIndex: number;
}

export interface GeneratedTestCase {
  input: string;
  expectedOutput: string;
  explanation?: string | undefined;
}

export interface CodingQuestion {
  prompt: string;
  topic: string;
  difficulty: Difficulty;
  type: "CODING";

  // CODING questions are validated by constraints/examples/test cases, so keywords are optional.
  expectedKeywords?: string[] | undefined;

  constraints: string[];

  examples: CodingExample[];

  testCases: GeneratedTestCase[];
}

export interface CodingExample {
  input: string;
  output: string;
  explanation?: string | undefined;
}

export type GeneratedQuestion =
  | TextQuestion
  | McqQuestion
  | CodingQuestion
  | SystemDesignQuestion;

export interface QuestionGenerationResponse {
  questions: GeneratedQuestion[];
}