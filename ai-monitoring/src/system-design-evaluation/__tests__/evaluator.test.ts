import { describe, expect, it, vi } from "vitest";

const { invokeMock } = vi.hoisted(() => ({
  invokeMock: vi.fn(),
}));

vi.mock("../../llm.js", () => ({
  llm: { invoke: invokeMock },
}));

import { evaluateSystemDesignArchitecture } from "../evaluator.js";

describe("System design evaluator", () => {
  it("includes candidate notes in the model request and validates the response", async () => {
    invokeMock.mockResolvedValue({
      content: JSON.stringify({
        overallScore: 81,
        completenessScore: 75,
        scalabilityScore: 84,
        componentSelectionScore: 80,
        summary: "The design separates reads and writes.",
        strengths: ["Clear service boundary"],
        bottlenecks: ["Single database"],
        suggestions: ["Add replicas"],
      }),
    });

    const result = await evaluateSystemDesignArchitecture({
      questionPrompt: "Design a URL shortener.",
      nodes: [{ id: "api", type: "SERVICE", label: "API" }],
      edges: [],
      candidateNotes: "Short codes are generated with collision checks.",
    });

    expect(invokeMock).toHaveBeenCalledWith(
      expect.stringContaining("Short codes are generated with collision checks.")
    );
    expect(result.overallScore).toBe(81);
    expect(result.summary).toBe("The design separates reads and writes.");
  });

  it("propagates model failures instead of manufacturing an evaluation", async () => {
    invokeMock.mockRejectedValue(new Error("model unavailable"));

    await expect(
      evaluateSystemDesignArchitecture({ nodes: [], edges: [] })
    ).rejects.toThrow("model unavailable");
  });

  it("rejects model output that does not satisfy the evaluation schema", async () => {
    invokeMock.mockResolvedValue({
      content: JSON.stringify({
        overallScore: 140,
        summary: "Invalid partial response",
      }),
    });

    await expect(
      evaluateSystemDesignArchitecture({ nodes: [], edges: [] })
    ).rejects.toThrow();
  });
});
