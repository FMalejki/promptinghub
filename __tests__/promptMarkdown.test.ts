import { promptToMarkdown } from "../lib/promptMarkdown";

describe("promptToMarkdown", () => {
  it("renders title, description and a single fenced file", () => {
    const md = promptToMarkdown({
      name: "Cold Email",
      description: "B2B outreach",
      files: [{ path: "prompt.txt", content: "Write an email" }],
    });
    expect(md.startsWith("# Cold Email\n\nB2B outreach\n")).toBe(true);
    expect(md).toContain("```\nWrite an email\n```");
  });

  it("labels each file path for a multi-file prompt", () => {
    const md = promptToMarkdown({
      name: "Pair",
      description: "",
      files: [
        { path: "system.txt", content: "sys" },
        { path: "user.txt", content: "usr" },
      ],
    });
    expect(md).toContain("## `system.txt`");
    expect(md).toContain("## `user.txt`");
  });

  it("omits a blank description cleanly", () => {
    const md = promptToMarkdown({ name: "X", description: "", files: [{ path: "f", content: "c" }] });
    expect(md).not.toContain("# X\n\n\n");
  });

  it("uses a ~~~ fence when content contains a code fence", () => {
    const md = promptToMarkdown({ name: "X", description: "", files: [{ path: "f", content: "```js\ncode\n```" }] });
    expect(md).toContain("~~~");
  });

  it("falls back to body when there are no files", () => {
    const md = promptToMarkdown({ name: "X", description: "d", body: "just a body" });
    expect(md).toContain("```\njust a body\n```");
  });
});
