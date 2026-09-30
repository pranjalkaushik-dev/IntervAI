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

  try {
    const response = await llm.invoke(prompt);
    const rawContent = typeof response.content === "string" ? response.content : JSON.stringify(response.content);
    const cleaned = rawContent.replace(/^```json\s*/i, "").replace(/^```\s*/, "").replace(/```$/, "").trim();
    const parsed = JSON.parse(cleaned);

    return {
      name: String(parsed.name || "Candidate"),
      email: String(parsed.email || ""),
      skills: Array.isArray(parsed.skills) ? parsed.skills.map(String) : [],
      technologies: Array.isArray(parsed.technologies) ? parsed.technologies.map(String) : [],
      projects: Array.isArray(parsed.projects) ? parsed.projects.map(String) : [],
      education: Array.isArray(parsed.education) ? parsed.education.map(String) : [],
      experience: Array.isArray(parsed.experience) ? parsed.experience.map(String) : [],
    };
  } catch (error) {
    console.warn("[AI Resume Parser Fallback]:", error);
    // Basic regex fallback if LLM is unavailable or fails JSON parsing
    const emailMatch = rawText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    return {
      name: "Parsed Candidate",
      email: emailMatch ? emailMatch[0] : "",
      skills: ["Software Engineering", "Problem Solving"],
      technologies: [],
      projects: [],
      education: [],
      experience: [],
    };
  }
}
