import { evaluateAnswer } from "./answer-evaluation/evaluator.js";

async function main(): Promise<void> {
  const result = await evaluateAnswer({
    question:
      "What is the difference between an array and a linked list?",
    candidateAnswer:
      "An array stores elements in contiguous memory and provides O(1) "
      + "random access. A linked list stores nodes connected using pointers, "
      + "so accessing an element takes O(n) because we may need to traverse "
      + "the list.",
    expectedKeywords: [
      "contiguous memory",
      "random access",
      "nodes",
      "pointers",
      "O(1)",
      "O(n)",
    ],
    interviewType: "TEXT",
  });

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error: unknown) => {
  console.error("Answer evaluation failed:", error);
});