import { ChatPromptTemplate } from "@langchain/core/prompts";
import { llm } from "../llm.js";
import { answerEvaluationSchema } from "./schema.js";

export const answerEvaluationPrompt =
  ChatPromptTemplate.fromMessages([
    [
      "system",
      `You are an expert technical interviewer evaluating a candidate's answer.

Evaluate only the information provided.

TECHNICAL EVALUATION:
- Score technical correctness from 0 to 100.
- Consider correctness, completeness, reasoning, and understanding.
- For CODING answers, consider algorithm, correctness, complexity, and edge cases.
- For TEXT answers, consider conceptual accuracy and completeness.
- For MCQ answers, determine whether the selected answer is correct.

COMMUNICATION EVALUATION:
- Score communication from 0 to 100.
- Consider clarity, structure, conciseness, and explanation of reasoning.
- Do not heavily penalize minor grammar or spelling mistakes.
- Keep communication score independent from technical score.

STRENGTHS:
- Give specific things the candidate did well.
- Avoid generic statements such as "good answer".

IMPROVEMENTS:
- Give specific and actionable improvements.
- Do not invent mistakes that are not present.

RECOMMENDATION:
Choose one:
- STRONG_HIRE
- HIRE
- MAYBE
- NO_HIRE
- null

Use null only when there is insufficient information.

Return only the structured evaluation.`,
    ],
    [
      "human",
      `QUESTION:
{question}

CANDIDATE ANSWER:
{candidateAnswer}

EXPECTED KEYWORDS / CONCEPTS:
{expectedKeywords}

INTERVIEW TYPE:
{interviewType}`,
    ],
  ]);


export const answerEvaluationChain =
  answerEvaluationPrompt.pipe(
    llm.withStructuredOutput(answerEvaluationSchema)
  );
