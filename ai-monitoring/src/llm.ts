import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import "dotenv/config";

const apiKey = process.env.GEMINI_API_KEY;

class MissingGeminiLlm {
  async invoke(_input: any): Promise<any> {
    throw new Error(
      "GEMINI_API_KEY is not configured. Add it to ai-monitoring/.env to enable AI features."
    );
  }

  withStructuredOutput(_schema: unknown): any {
    return {
      async invoke() {
        throw new Error(
          "GEMINI_API_KEY is not configured. Add it to ai-monitoring/.env to enable AI features."
        );
      },
    };
  }
}

export const llm = apiKey
  ? new ChatGoogleGenerativeAI({
      apiKey,
      model: process.env.GEMINI_MODEL || "gemini-3-flash-preview",
      temperature: 0.2,
    })
  : new MissingGeminiLlm();

export const geminiConfigured = Boolean(apiKey);
