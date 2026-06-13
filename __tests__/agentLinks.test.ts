import { AGENT_TARGETS, buildAgentTargets } from "../lib/agentLinks";

describe("AGENT_TARGETS", () => {
  it("includes the major coding agents (incl. Antigravity) with unique ids", () => {
    const ids = AGENT_TARGETS.map((t) => t.id);
    expect(ids).toEqual(expect.arrayContaining(["claude-code", "cursor", "antigravity", "vscode", "windsurf"]));
    expect(new Set(ids).size).toBe(ids.length); // no duplicates
  });
  it("every target has a label and a paste hint", () => {
    for (const t of AGENT_TARGETS) {
      expect(t.label.length).toBeGreaterThan(0);
      expect(t.hint.length).toBeGreaterThan(0);
    }
  });
  it("launchable editors carry a URL scheme; Claude Code (CLI) has none", () => {
    const byId = Object.fromEntries(AGENT_TARGETS.map((t) => [t.id, t]));
    expect(byId["claude-code"].scheme).toBeNull();
    expect(byId["cursor"].scheme).toBe("cursor://");
    expect(byId["antigravity"].scheme).toBe("antigravity://");
    expect(byId["vscode"].scheme).toBe("vscode://");
    expect(byId["windsurf"].scheme).toBe("windsurf://");
  });
  it("every scheme (when present) ends with :// so it launches the app", () => {
    for (const t of AGENT_TARGETS) {
      if (t.scheme !== null) expect(t.scheme).toMatch(/:\/\/$/);
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
