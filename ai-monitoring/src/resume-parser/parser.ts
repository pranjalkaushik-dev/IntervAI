import { llm } from "../llm.js";

export interface ParsedResumeData {
  name: string;
  email: string;
  skills: string[];
  technologies: string[];
  projects: string[];
  education: string[];
  experience: string[];
}

export async function parseResumeTextWithAi(rawText: string): Promise<ParsedResumeData> {
  const prompt = `You are an expert HR and technical recruiter AI. Extract structured candidate information from the following raw resume text.

RAW RESUME TEXT:
${rawText.slice(0, 15000)}

Return ONLY a valid JSON object matching this exact structure, with no markdown formatting or extra text:
{
  "name": "Candidate Name or Unknown",
  "email": "candidate email or empty string",
  "skills": ["Skill1", "Skill2"],
  "technologies": ["Tech1", "Tech2"],
  "projects": ["Project Name / Brief Description"],
  "education": ["Degree / Institution"],
  "experience": ["Role / Company / Duration"]
}

Important: Extract ONLY factual data from the text. Do not invent missing experience or skills.`;

  const response = await llm.invoke(prompt);
  const rawContent = typeof response.content === "string" ? response.content : JSON.stringify(response.content);
  const cleaned = rawContent.replace(/^```json\s*/i, "").replace(/^```\s*/, "").replace(/```$/, "").trim();
  const parsed = JSON.parse(cleaned);

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    typeof parsed.name !== "string" ||
    typeof parsed.email !== "string" ||
    !["skills", "technologies", "projects", "education", "experience"].every((key) =>
      Array.isArray(parsed[key]) && parsed[key].every((value: unknown) => typeof value === "string")
    )
  ) {
    throw new Error("AI resume response did not match the required format");
  }

  return {
    name: parsed.name,
    email: parsed.email,
    skills: parsed.skills,
    technologies: parsed.technologies,
    projects: parsed.projects,
    education: parsed.education,
    experience: parsed.experience,
  };
}
