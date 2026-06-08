import { promptToText } from "../lib/promptText";

describe("promptToText", () => {
  it("joins files with path headers", () => {
    expect(
      promptToText({ body: "ignored", files: [{ path: "a.md", content: "hello" }, { path: "b.txt", content: "world" }] }),
    ).toBe("# a.md\nhello\n\n# b.txt\nworld");
  });

  it("falls back to body when there are no files", () => {
    expect(promptToText({ body: "just text", files: [] })).toBe("just text");
    expect(promptToText({ body: "x", files: null })).toBe("x");
    expect(promptToText({})).toBe("");
  });
});
