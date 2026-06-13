import { AGENT_TARGETS, buildAgentTargets } from "../lib/agentLinks";

describe("AGENT_TARGETS", () => {
  it("includes the major coding agents with unique ids", () => {
    const ids = AGENT_TARGETS.map((t) => t.id);
    expect(ids).toEqual(expect.arrayContaining(["claude-code", "cursor", "vscode", "windsurf"]));
    expect(new Set(ids).size).toBe(ids.length); // no duplicates
  });
  it("every target has a label and a paste hint", () => {
    for (const t of AGENT_TARGETS) {
      expect(t.label.length).toBeGreaterThan(0);
      expect(t.hint.length).toBeGreaterThan(0);
    }
  });
});

describe("buildAgentTargets", () => {
  it("returns the targets when there is usable text", () => {
    expect(buildAgentTargets("do the thing")).toBe(AGENT_TARGETS);
  });
  it("returns null when the text is empty / whitespace", () => {
    expect(buildAgentTargets("")).toBeNull();
    expect(buildAgentTargets("   \n ")).toBeNull();
  });
});
