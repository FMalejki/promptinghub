import { rawPromptText } from "../lib/promptText";

describe("rawPromptText", () => {
  it("returns just the content for a single-file prompt (clean for piping)", () => {
    expect(rawPromptText({ files: [{ path: "prompt.txt", content: "Write a haiku" }] })).toBe("Write a haiku");
  });

  it("prefixes each file with its path for a multi-file prompt", () => {
    expect(
      rawPromptText({
        files: [
          { path: "system.txt", content: "You are helpful" },
          { path: "user.txt", content: "Hi" },
        ],
      })
    ).toBe("# system.txt\nYou are helpful\n\n# user.txt\nHi");
  });

  it("falls back to body when there are no files", () => {
    expect(rawPromptText({ body: "plain body", files: [] })).toBe("plain body");
    expect(rawPromptText({ body: "plain body" })).toBe("plain body");
  });

  it("returns an empty string when there is nothing", () => {
    expect(rawPromptText({})).toBe("");
    expect(rawPromptText({ files: null })).toBe("");
  });
});
