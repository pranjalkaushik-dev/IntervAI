import { llm } from "./llm.js";

console.log("STARTING LANGCHAIN GEMINI TEST...");

try {
  const response = await llm.invoke(
    "Reply with exactly: LangChain connection works"
  );

  console.log("RESPONSE RECEIVED:");
  console.log(response.content);
} catch (error: unknown) {
  console.error("LANGCHAIN GEMINI ERROR:");
  console.error(error);
}
