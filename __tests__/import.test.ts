import { parsePastedPrompt, looksLikeSkill } from "../lib/import";

describe("looksLikeSkill", () => {
  it("flags a SKILL.md file (strongest signal)", () => {
    expect(looksLikeSkill({ files: [{ path: "prompt.txt" }, { path: "SKILL.md" }] })).toBe(true);
    expect(looksLikeSkill({ files: [{ path: "skills/my/skill.md" }] })).toBe(true);
  });
  it("flags pasted frontmatter carrying both name and description", () => {
    expect(looksLikeSkill({ text: "---\nname: pdf-filler\ndescription: fills PDFs\n---\nbody here" })).toBe(true);
  });
  it("flags an explicit '# Skill' heading", () => {
    expect(looksLikeSkill({ text: "# Skill: Commit writer\n\nDo the thing." })).toBe(true);
  });
  it("does NOT flag an ordinary prompt or partial frontmatter", () => {
    expect(looksLikeSkill({ text: "Act as a helpful assistant and summarize." })).toBe(false);
    expect(looksLikeSkill({ text: "---\nname: only-name\n---\nbody" })).toBe(false);
    expect(looksLikeSkill({ files: [{ path: "prompt.txt" }, { path: "README.md" }] })).toBe(false);
    expect(looksLikeSkill({})).toBe(false);
  });
  it("parsePastedPrompt sets isSkill on a SKILL.md-style paste only", () => {
    expect(parsePastedPrompt("---\nname: x\ndescription: y\n---\nbody")?.isSkill).toBe(true);
    expect(parsePastedPrompt("just a normal prompt")?.isSkill).toBeUndefined();
  });
});

describe("parsePastedPrompt", () => {
  it("returns null for empty / whitespace input", () => {
    expect(parsePastedPrompt("")).toBeNull();
    expect(parsePastedPrompt("   \n  \t ")).toBeNull();
  });

  it("derives a name + description from plain text", () => {
    const d = parsePastedPrompt("Summarize the following article in 3 bullet points.\nKeep it concise.")!;
    expect(d.name).toBe("Summarize the following article in 3 bullet points.");
    expect(d.description).toBe("Summarize the following article in 3 bullet points.");
    expect(d.body).toContain("Keep it concise.");
    expect(d.category).toBe("Other");
  });

  it("strips a leading markdown heading when deriving the name", () => {
    const d = parsePastedPrompt("# Cold Email Writer\nWrite a cold email.")!;
    expect(d.name).toBe("Cold Email Writer");
  });

  it("truncates an overly long derived name", () => {
    const long = "x".repeat(200);
    const d = parsePastedPrompt(long)!;
    expect(d.name.length).toBeLessThanOrEqual(100);
  });

  it("parses frontmatter for name/description/category/models", () => {
    const raw = [
      "---",
      "name: Outreach Bot",
      "description: Generates cold outreach emails",
      "category: Marketing",
      "models: gpt-4o, claude-opus-4",
      "---",
      "Write a cold email to {{company}} about {{product}}.",
    ].join("\n");
    const d = parsePastedPrompt(raw)!;
    expect(d.name).toBe("Outreach Bot");
    expect(d.description).toBe("Generates cold outreach emails");
    expect(d.category).toBe("Marketing");
    expect(d.testedModels).toEqual([{ modelId: "gpt-4o" }, { modelId: "claude-opus-4" }]);
    expect(d.body).toBe("Write a cold email to {{company}} about {{product}}.");
  });

  it("accepts title/desc/cat aliases case-insensitively", () => {
    const raw = ["---", "Title: My Prompt", "DESC: short", "Cat: Coding", "---", "do the thing"].join("\n");
    const d = parsePastedPrompt(raw)!;
    expect(d.name).toBe("My Prompt");
    expect(d.description).toBe("short");
    expect(d.category).toBe("Coding");
  });

  it("falls back to body-derived fields when frontmatter omits them", () => {
    const raw = ["---", "category: Coding", "---", "Refactor this function for readability."].join("\n");
    const d = parsePastedPrompt(raw)!;
    expect(d.category).toBe("Coding");
    expect(d.name).toBe("Refactor this function for readability.");
    expect(d.body).toBe("Refactor this function for readability.");
  });

  it("records the source label", () => {
    const d = parsePastedPrompt("hello", "twitter")!;
    expect(d.source).toBe("twitter");
    expect(parsePastedPrompt("hello")!.source).toBe("paste");
  });
});
