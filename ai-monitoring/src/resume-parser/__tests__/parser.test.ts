import { describe, expect, it, vi } from "vitest";

const { invokeMock } = vi.hoisted(() => ({
  invokeMock: vi.fn(),
}));

vi.mock("../../llm.js", () => ({
  llm: { invoke: invokeMock },
}));

import { parseResumeTextWithAi } from "../parser.js";

describe("Resume parser", () => {
  it("returns structured facts from a valid AI response", async () => {
    invokeMock.mockResolvedValue({
      content: JSON.stringify({
        name: "Candidate",
        email: "candidate@example.test",
        skills: ["TypeScript"],
        technologies: ["Node.js"],
        projects: [],
        education: [],
        experience: [],
      }),
    });

    await expect(parseResumeTextWithAi("Candidate with TypeScript experience."))
      .resolves.toMatchObject({
        name: "Candidate",
        skills: ["TypeScript"],
        technologies: ["Node.js"],
      });
  });

  it("rejects invalid AI output instead of returning invented profile data", async () => {
    invokeMock.mockResolvedValue({
      content: JSON.stringify({ name: "Parsed Candidate" }),
    });

    await expect(parseResumeTextWithAi("A resume with some content."))
      .rejects.toThrow("AI resume response did not match the required format");
  });
});
