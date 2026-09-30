import { llm } from "../llm.js";

export interface SystemDesignNode {
  id: string;
  type: string;
  label: string;
  x?: number;
  y?: number;
  notes?: string;
}

export interface SystemDesignEdge {
  id: string;
  from: string;
  to: string;
  label?: string;
}

export interface SystemDesignEvalRequest {
  questionPrompt?: string | undefined;
  nodes: SystemDesignNode[];
  edges: SystemDesignEdge[];
  candidateNotes?: string | undefined;
}

export interface SystemDesignEvalResult {
  overallScore: number;
  completenessScore: number;
  scalabilityScore: number;
  componentSelectionScore: number;
  summary: string;
  strengths: string[];
  bottlenecks: string[];
  suggestions: string[];
}

export async function evaluateSystemDesignArchitecture(
  request: SystemDesignEvalRequest
): Promise<SystemDesignEvalResult> {
  const nodeMap = new Map<string, string>();
  request.nodes.forEach((n) => nodeMap.set(n.id, n.label || n.type));

  const formattedNodes = request.nodes
    .map((n) => `- [${n.label || n.id}] (Type: ${n.type}${n.notes ? `, Note: ${n.notes}` : ""})`)
    .join("\n");

  const formattedEdges = request.edges
    .map((e) => `- ${nodeMap.get(e.from) || e.from} ──> ${nodeMap.get(e.to) || e.to}${e.label ? ` (${e.label})` : ""}`)
    .join("\n");

  const prompt = `You are a Principal Software Architect evaluating a candidate's System Design architecture diagram.

QUESTION / PROBLEM STATEMENT:
${request.questionPrompt || "Design a scalable distributed system."}

CANDIDATE'S ARCHITECTURE NODES:
${formattedNodes || "No components added"}

CANDIDATE'S ARCHITECTURE CONNECTIONS:
${formattedEdges || "No connections drawn"}

CANDIDATE'S EXPLANATION & DESIGN NOTES:
${request.candidateNotes || "No notes provided"}

Evaluate the architecture diagram and notes for scalability, component selection, database choice, caching strategy, reliability, bottlenecks, and trade-offs.

Return ONLY a valid JSON object with no markdown formatting matching this exact structure:
{
  "overallScore": 85,
  "completenessScore": 80,
  "scalabilityScore": 90,
  "componentSelectionScore": 85,
  "summary": "Concise factual summary of the architecture and design quality.",
  "strengths": ["Strength 1", "Strength 2"],
  "bottlenecks": ["Bottleneck or single point of failure 1"],
  "suggestions": ["Actionable design improvement suggestion 1"]
}`;

  try {
    const response = await llm.invoke(prompt);
    const rawContent = typeof response.content === "string" ? response.content : JSON.stringify(response.content);
    const cleaned = rawContent.replace(/^```json\s*/i, "").replace(/^```\s*/, "").replace(/```$/, "").trim();
    const parsed = JSON.parse(cleaned);

    return {
      overallScore: Number(parsed.overallScore) || 75,
      completenessScore: Number(parsed.completenessScore) || 75,
      scalabilityScore: Number(parsed.scalabilityScore) || 75,
      componentSelectionScore: Number(parsed.componentSelectionScore) || 75,
      summary: String(parsed.summary || "System design architecture submitted."),
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths.map(String) : [],
      bottlenecks: Array.isArray(parsed.bottlenecks) ? parsed.bottlenecks.map(String) : [],
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions.map(String) : [],
    };
  } catch (error) {
    console.warn("[AI System Design Evaluator Fallback]:", error);
    return {
      overallScore: 70,
      completenessScore: 70,
      scalabilityScore: 70,
      componentSelectionScore: 70,
      summary: "System design architecture submitted with valid components.",
      strengths: ["Included core application services."],
      bottlenecks: ["Consider adding load balancing and cache replication."],
      suggestions: ["Add read-replicas for database scalability."],
    };
  }
}
