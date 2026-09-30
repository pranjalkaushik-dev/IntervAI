import { generateInterviewAssistantResponse } from "./assistant.js";

console.log("DEMO STARTED");

async function main(): Promise<void> {
  console.log("CALLING INTERVIEW ASSISTANT...");

  const result = await generateInterviewAssistantResponse({
    currentQuestion:
      "What is the average lookup complexity of a hash map?",
    candidateAnswer:
      "It is O(1) on average.",
    interviewType: "TEXT",
    difficulty: "MEDIUM",
    previousTurns: [
      {
        question: "What data structure would you use for fast key-value lookup?",
        candidateAnswer:
          "I would use a hash map because it provides constant-time average lookup.",
        technicalScore: 85,
        communicationScore: 80,
        summary:
          "The candidate demonstrated a good understanding of hash maps and their average lookup complexity.",
      },
    ],
  });

  console.log("GEMINI RESPONSE RECEIVED");

  console.log("\nAI INTERVIEW ASSISTANT");
  console.log("=====================");
  console.log(`Action: ${result.action}`);
  console.log(`Message: ${result.message}`);
  console.log(`Next Question: ${result.nextQuestion}`);
  console.log(`Reason: ${result.reason}`);
}

main().catch((error: unknown) => {
  console.error("Interview Assistant failed:", error);
  process.exitCode = 1;
});
