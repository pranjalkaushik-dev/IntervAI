import type {
  GeneratedQuestion,
  McqQuestion,
  CodingQuestion,
} from "./types.js";

export function validateQuestionQuality(
  questions: GeneratedQuestion[],
  expectedCount: number
): void {
  if (questions.length !== expectedCount) {
    throw new Error(
      `Expected ${expectedCount} questions, but received ${questions.length}`
    );
  }

  const normalizedPrompts = new Set<string>();

  for (const [index, question] of questions.entries()) {
    const prompt = question.prompt.trim();

    if (prompt.length < 20) {
      throw new Error(
        `Question ${index + 1} is too short to be a meaningful interview question`
      );
    }

    const normalizedPrompt = prompt
      .toLowerCase()
      .replace(/\s+/g, " ");

    if (normalizedPrompts.has(normalizedPrompt)) {
      throw new Error(
        `Duplicate question detected at position ${index + 1}`
      );
    }

    normalizedPrompts.add(normalizedPrompt);

    if (question.expectedKeywords && question.expectedKeywords.length === 0) {
      throw new Error(
        `Question ${index + 1} must contain expected keywords`
      );
    }

    if (question.type === "MCQ") {
      validateMcqQuestion(question, index);
    }

    if (question.type === "CODING") {
      validateCodingQuestion(question, index);
    }
  }
}

function validateMcqQuestion(
  question: McqQuestion,
  index: number
): void {
  if (question.options.length !== 4) {
    throw new Error(
      `MCQ question ${index + 1} must contain exactly 4 options`
    );
  }

  if (
    question.correctOptionIndex < 0 ||
    question.correctOptionIndex >= question.options.length
  ) {
    throw new Error(
      `MCQ question ${index + 1} has an invalid correct option index`
    );
  }

  const normalizedOptions = question.options.map((option) =>
    option.trim().toLowerCase()
  );

  if (new Set(normalizedOptions).size !== normalizedOptions.length) {
    throw new Error(
      `MCQ question ${index + 1} contains duplicate options`
    );
  }
}

function validateCodingQuestion(
  question: CodingQuestion,
  index: number
): void {
  if (question.constraints.length === 0) {
    throw new Error(
      `Coding question ${index + 1} must contain constraints`
    );
  }

  if (question.examples.length === 0) {
    throw new Error(
      `Coding question ${index + 1} must contain at least one example`
    );
  }

  if (question.testCases.length < 3) {
    throw new Error(
      `Coding question ${index + 1} must contain at least 3 test cases`
    );
  }
}