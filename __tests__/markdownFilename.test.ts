import { markdownFilename } from "../lib/promptMarkdown";

describe("markdownFilename", () => {
  it("slugifies the prompt name and appends .md", () => {
    expect(markdownFilename("Cold Email Generator")).toBe("cold-email-generator.md");
    expect(markdownFilename("GPT-4 / System Prompt!")).toBe("gpt-4-system-prompt.md");
  });

  it("falls back to prompt.md for empty/garbage names", () => {
    expect(markdownFilename("")).toBe("prompt.md");
    expect(markdownFilename("   ")).toBe("prompt.md");
    expect(markdownFilename("!!!")).toBe("prompt.md");
  });

  it("strips diacritics and caps length", () => {
    expect(markdownFilename("Résumé Builder")).toBe("resume-builder.md");
    const long = "a".repeat(200);
    const out = markdownFilename(long);
    expect(out.endsWith(".md")).toBe(true);
    expect(out.length).toBeLessThanOrEqual(63); // 60-char slug cap + ".md"
  });
});
