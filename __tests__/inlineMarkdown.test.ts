import { parseInline } from "../lib/inlineMarkdown";

describe("parseInline", () => {
  it("returns a single text segment for plain text", () => {
    expect(parseInline("hello world")).toEqual([{ type: "text", text: "hello world" }]);
  });

  it("parses bold, italic and code", () => {
    expect(parseInline("a **b** c")).toEqual([
      { type: "text", text: "a " },
      { type: "bold", text: "b" },
      { type: "text", text: " c" },
    ]);
    expect(parseInline("an _em_ word")).toEqual([
      { type: "text", text: "an " },
      { type: "italic", text: "em" },
      { type: "text", text: " word" },
    ]);
    expect(parseInline("run `npm test` now")).toEqual([
      { type: "text", text: "run " },
      { type: "code", text: "npm test" },
      { type: "text", text: " now" },
    ]);
  });

  it("does not parse markdown inside a code span", () => {
    expect(parseInline("`a **b**`")).toEqual([{ type: "code", text: "a **b**" }]);
  });

  it("prefers bold over italic for double-star", () => {
    expect(parseInline("**x**")).toEqual([{ type: "bold", text: "x" }]);
  });

  it("leaves an unmatched marker as literal text", () => {
    expect(parseInline("a * b")).toEqual([{ type: "text", text: "a * b" }]);
    expect(parseInline("a ** b")).toEqual([{ type: "text", text: "a ** b" }]);
  });

  it("ignores empty emphasis", () => {
    expect(parseInline("****")).toEqual([{ type: "text", text: "****" }]);
    expect(parseInline("``")).toEqual([{ type: "text", text: "``" }]);
  });

  it("handles multiple spans in one string", () => {
    expect(parseInline("**a** and `b` and _c_")).toEqual([
      { type: "bold", text: "a" },
      { type: "text", text: " and " },
      { type: "code", text: "b" },
      { type: "text", text: " and " },
      { type: "italic", text: "c" },
    ]);
  });
});
