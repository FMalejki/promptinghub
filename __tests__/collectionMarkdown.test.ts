import { collectionToMarkdown } from "../lib/collectionMarkdown";

const bundle = {
  name: "Marketing Pack",
  description: "Prompts for growth",
  prompts: [
    {
      name: "Cold Email",
      description: "B2B outreach",
      files: [{ path: "prompt.md", content: "Write a cold email to {{name}}." }],
    },
    {
      name: "Tweet Thread",
      description: "",
      files: [
        { path: "a.md", content: "Hook line" },
        { path: "b.md", content: "Body line" },
      ],
    },
  ],
};

describe("collectionToMarkdown", () => {
  it("starts with the collection title and description", () => {
    const md = collectionToMarkdown(bundle);
    expect(md.startsWith("# Marketing Pack\n\nPrompts for growth\n")).toBe(true);
  });

  it("renders each prompt as a section with its files in fenced blocks", () => {
    const md = collectionToMarkdown(bundle);
    expect(md).toContain("## Cold Email");
    expect(md).toContain("B2B outreach");
    expect(md).toContain("`prompt.md`");
    expect(md).toContain("```\nWrite a cold email to {{name}}.\n```");
  });

  it("labels multi-file prompts with each file path and omits a blank description", () => {
    const md = collectionToMarkdown(bundle);
    expect(md).toContain("## Tweet Thread");
    expect(md).toContain("`a.md`");
    expect(md).toContain("`b.md`");
    // blank description should not leave a stray empty line block under the heading
    expect(md).not.toContain("## Tweet Thread\n\n\n");
  });

  it("handles an empty collection", () => {
    const md = collectionToMarkdown({ name: "Empty", description: "", prompts: [] });
    expect(md).toBe("# Empty\n");
  });

  it("escapes a code fence inside prompt content so the block stays valid", () => {
    const md = collectionToMarkdown({
      name: "X",
      description: "",
      prompts: [{ name: "P", description: "", files: [{ path: "f", content: "```js\ncode\n```" }] }],
    });
    // inner triple backticks must be neutralized (we fence with ~~~ when content has ```)
    expect(md).toContain("~~~");
  });
});
