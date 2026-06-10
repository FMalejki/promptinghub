import { extractMentions, renderMentions, classifyMentions } from "../lib/mentions";

describe("extractMentions", () => {
  it("pulls unique @handles out of a comment body", () => {
    expect(extractMentions("hey @alice and @bob, nice work")).toEqual(["alice", "bob"]);
  });

  it("lowercases and dedupes", () => {
    expect(extractMentions("@Alice @alice @ALICE")).toEqual(["alice"]);
  });

  it("matches handles with hyphens, digits and underscores", () => {
    expect(extractMentions("ping @ada-99 and @bob_smith")).toEqual(["ada-99", "bob_smith"]);
  });

  it("ignores emails so domain text isn't a mention", () => {
    expect(extractMentions("mail me at bob@example.com please")).toEqual([]);
  });

  it("returns an empty array when there are no mentions", () => {
    expect(extractMentions("just a normal comment")).toEqual([]);
    expect(extractMentions("")).toEqual([]);
  });

  it("does not capture a bare @ or trailing punctuation", () => {
    expect(extractMentions("look @ this @carol! great")).toEqual(["carol"]);
  });

  it("caps the number of mentions to avoid notification spam", () => {
    const body = Array.from({ length: 20 }, (_, i) => `@user${i}`).join(" ");
    expect(extractMentions(body).length).toBeLessThanOrEqual(10);
  });
});

describe("classifyMentions", () => {
  it("splits draft mentions into confirmed (real users) and unknown", () => {
    const { confirmed, unknown } = classifyMentions("hi @alice and @nobody", ["alice"]);
    expect(confirmed).toEqual(["alice"]);
    expect(unknown).toEqual(["nobody"]);
  });

  it("is case-insensitive against the known set", () => {
    const { confirmed, unknown } = classifyMentions("yo @Alice", ["ALICE"]);
    expect(confirmed).toEqual(["alice"]);
    expect(unknown).toEqual([]);
  });

  it("treats everything as unknown when no handles resolve", () => {
    const { confirmed, unknown } = classifyMentions("@a @b @c", []);
    expect(confirmed).toEqual([]);
    expect(unknown).toEqual(["a", "b", "c"]);
  });

  it("returns empty lists for a body with no mentions", () => {
    expect(classifyMentions("plain text", ["alice"])).toEqual({ confirmed: [], unknown: [] });
  });

  it("ignores emails (no false positive on domain text)", () => {
    expect(classifyMentions("reach me at bob@x.com", ["x"])).toEqual({ confirmed: [], unknown: [] });
  });
});

describe("renderMentions", () => {
  it("splits text and mention segments, preserving the original string", () => {
    const parts = renderMentions("hi @alice see this");
    expect(parts).toEqual([
      { type: "text", text: "hi " },
      { type: "mention", handle: "alice" },
      { type: "text", text: " see this" },
    ]);
    expect(parts.map((p) => (p.type === "mention" ? `@${p.handle}` : p.text)).join("")).toBe("hi @alice see this");
  });

  it("keeps original casing of mentions and handles trailing punctuation", () => {
    const parts = renderMentions("ping @Bob!");
    expect(parts).toEqual([
      { type: "text", text: "ping " },
      { type: "mention", handle: "Bob" },
      { type: "text", text: "!" },
    ]);
  });

  it("returns a single text part when there are no mentions", () => {
    expect(renderMentions("nothing here")).toEqual([{ type: "text", text: "nothing here" }]);
  });

  it("does not treat an email as a mention", () => {
    expect(renderMentions("a@b.com")).toEqual([{ type: "text", text: "a@b.com" }]);
  });
});
