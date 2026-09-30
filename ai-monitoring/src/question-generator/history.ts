import type { GeneratedQuestion } from "./types.js";

const questionHistory: GeneratedQuestion[] = [];

export function addQuestionsToHistory(
  questions: GeneratedQuestion[]
): void {
  questionHistory.push(...questions);
}

export function getQuestionHistory(): GeneratedQuestion[] {
  return [...questionHistory];
}

export function clearQuestionHistory(): void {
  questionHistory.length = 0;
}