import { questionGenerationChain } from "./src/question-generator/prompt.js";

async function main() {
  try {
    const res = await questionGenerationChain.invoke({
      role: "Backend Developer",
      mode: "DSA",
      skills: "Node.js, Express, MongoDB",
      difficulty: "EASY",
      type: "TEXT",
      numberOfQuestions: "1",
      previousQuestions: "None",
    });
    console.log("=== GEMINI SUCCESS ===");
    console.log(JSON.stringify(res, null, 2).slice(0, 800));
  } catch (e: any) {
    console.log("=== GEMINI ERROR ===");
    console.log("name   :", e?.name);
    console.log("status :", e?.status ?? e?.response?.status);
    console.log("message:", e?.message);
  }
}

main();
