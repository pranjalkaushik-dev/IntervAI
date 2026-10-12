import { gemini } from "./gemini.js";

console.log("STARTING DIRECT GEMINI TEST...");

try {
  const response = await gemini.models.generateContent({
    model: process.env.GEMINI_MODEL || "gemini-3-flash-preview",
    contents: "Reply with exactly: Gemini connection works",
  });

  console.log("RESPONSE RECEIVED:");
  console.log(response.text);
} catch (error: unknown) {
  console.error("GEMINI ERROR:");
  console.error(error);
}
