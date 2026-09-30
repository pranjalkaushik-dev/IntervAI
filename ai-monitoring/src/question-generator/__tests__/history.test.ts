import { describe, expect, it, beforeEach } from "vitest";
import {
  addQuestionsToHistory,
  getQuestionHistory,
  clearQuestionHistory,
} from "../history.js";

describe("Question History", () => {
  beforeEach(() => {
    clearQuestionHistory();
  });

  it("starts with an empty history", () => {
    expect(getQuestionHistory()).toEqual([]);
  });

  it("stores generated questions", () => {
    const questions = [
      {
        prompt: "Explain how a hash table works in detail.",
        topic: "Data Structures",
        difficulty: "MEDIUM" as const,
        expectedKeywords: ["hashing", "collision", "lookup"],
        type: "TEXT" as const,
      },
    ];

    addQuestionsToHistory(questions);

    expect(getQuestionHistory()).toEqual(questions);
  });

  it("stores multiple questions", () => {
    const questions = [
      {
        prompt: "Explain how a binary search tree works in detail.",
        topic: "Trees",
        difficulty: "MEDIUM" as const,
        expectedKeywords: ["BST", "search", "insertion"],
        type: "TEXT" as const,
      },
      {
        prompt: "Explain how a stack differs from a queue in detail.",
        topic: "Data Structures",
        difficulty: "EASY" as const,
        expectedKeywords: ["stack", "queue", "LIFO", "FIFO"],
        type: "TEXT" as const,
      },
    ];

    addQuestionsToHistory(questions);

    expect(getQuestionHistory()).toHaveLength(2);
  });

  it("returns a copy of the history", () => {
    const questions = [
      {
        prompt: "Explain the concept of recursion with an example.",
        topic: "Recursion",
        difficulty: "EASY" as const,
        expectedKeywords: ["recursion", "base case"],
        type: "TEXT" as const,
      },
    ];

    addQuestionsToHistory(questions);

    const history = getQuestionHistory();
    history.pop();

    expect(getQuestionHistory()).toHaveLength(1);
  });

  it("clears the question history", () => {
    const questions = [
      {
        prompt: "Explain how a queue works and where it is commonly used.",
        topic: "Data Structures",
        difficulty: "EASY" as const,
        expectedKeywords: ["queue", "FIFO"],
        type: "TEXT" as const,
      },
    ];

    addQuestionsToHistory(questions);

    expect(getQuestionHistory()).toHaveLength(1);

    clearQuestionHistory();

    expect(getQuestionHistory()).toEqual([]);
  });
});