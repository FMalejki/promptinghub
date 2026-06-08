import { buildLlmsTxt } from "../lib/llmsTxt";

const BASE = "https://promptinghub-night-shift.vercel.app";

describe("buildLlmsTxt", () => {
  const prompts = [
    { id: "1", name: "Code Reviewer", description: "Reviews a diff for bugs.", handle: "ada", slug: "code-reviewer" },
    { id: "2", name: "Tweet Writer", description: "Drafts a punchy tweet." },
  ];

  it("starts with an H1 project name and a blockquote summary (llmstxt.org format)", () => {
    const txt = buildLlmsTxt(BASE, prompts);
    const lines = txt.split("\n");
    expect(lines[0]).toBe("# PromptingHub");
    expect(txt).toMatch(/\n> .+/); // a blockquote summary line
  });

  it("lists prompts as markdown links with canonical URLs and descriptions", () => {
    const txt = buildLlmsTxt(BASE, prompts);
    // namespaced canonical when handle+slug present
    expect(txt).toContain(`- [Code Reviewer](${BASE}/p/ada/code-reviewer): Reviews a diff for bugs.`);
    // id fallback when not namespaced
    expect(txt).toContain(`- [Tweet Writer](${BASE}/prompt/2): Drafts a punchy tweet.`);
  });

  it("includes a Resources section pointing at the key site surfaces", () => {
    const txt = buildLlmsTxt(BASE, prompts);
    expect(txt).toContain("## ");
    expect(txt).toContain(`(${BASE}/browse)`);
    expect(txt).toContain(`(${BASE}/sitemap.xml)`);
  });

  it("collapses newlines in a description to keep each entry on one line", () => {
    const txt = buildLlmsTxt(BASE, [
      { id: "3", name: "Multi", description: "line one\nline two", handle: "x", slug: "multi" },
    ]);
    expect(txt).toContain("- [Multi](" + BASE + "/p/x/multi): line one line two");
    expect(txt).not.toContain("line one\nline two");
  });

  it("omits the trailing ': description' when a prompt has no description", () => {
    const txt = buildLlmsTxt(BASE, [{ id: "4", name: "Bare", handle: "x", slug: "bare" }]);
    expect(txt).toContain(`- [Bare](${BASE}/p/x/bare)\n`);
    expect(txt).not.toContain("Bare](" + BASE + "/p/x/bare):");
  });

  it("renders a well-formed document even with zero prompts", () => {
    const txt = buildLlmsTxt(BASE, []);
    expect(txt.startsWith("# PromptingHub")).toBe(true);
    expect(txt).toContain(`(${BASE}/browse)`);
  });
});
