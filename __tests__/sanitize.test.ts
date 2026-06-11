import { findSensitiveTokens, isPublishable } from "../lib/sanitize";

describe("findSensitiveTokens", () => {
  it("flags absolute home paths", () => {
    const m = findSensitiveTokens("see /Users/adriankrawczyk/.claude/skills");
    expect(m.some((x) => x.kind === "absolute-home-path")).toBe(true);
  });

  it("flags personal routine/client tooling paths", () => {
    expect(findSensitiveTokens("~/syncd-routine/runs/x.log").some((x) => x.kind === "personal-tooling-path")).toBe(true);
  });

  it("flags emails", () => {
    expect(findSensitiveTokens("ping me at someone@example.com").some((x) => x.kind === "email")).toBe(true);
  });

  it("flags private client / person names case-insensitively", () => {
    expect(findSensitiveTokens("the syncd-mobile repo").some((x) => x.kind === "client-name")).toBe(true);
    expect(findSensitiveTokens("reviewer Bgawkuc").some((x) => x.kind === "client-name")).toBe(true);
  });

  it("flags issue-tracker ticket ids but NOT model names", () => {
    expect(findSensitiveTokens("close SYNCD-367").some((x) => x.kind === "ticket-id")).toBe(true);
    expect(findSensitiveTokens("tested on GPT-4 and CLAUDE-3").some((x) => x.kind === "ticket-id")).toBe(false);
  });

  it("flags secret assignments and .env files", () => {
    expect(findSensitiveTokens("API_KEY=sk-123").some((x) => x.kind === "secret-assignment")).toBe(true);
    expect(findSensitiveTokens("password: hunter2").some((x) => x.kind === "secret-assignment")).toBe(true);
    expect(findSensitiveTokens("load .env.local").some((x) => x.kind === "env-file")).toBe(true);
  });

  it("returns nothing for clean, universal content", () => {
    const clean = "Interview the user one question at a time and cite evidence (a file path, a docs URL, a web search).";
    expect(findSensitiveTokens(clean)).toEqual([]);
    expect(isPublishable(clean)).toBe(true);
  });
});

describe("isPublishable", () => {
  it("is false when any sensitive token is present", () => {
    expect(isPublishable("see /Users/bob/notes and email bob@x.com")).toBe(false);
  });
  it("is true for clean content", () => {
    expect(isPublishable("A generic, reusable prompting technique with no PII.")).toBe(true);
  });
});
