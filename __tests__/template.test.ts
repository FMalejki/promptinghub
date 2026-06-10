import { extractVariables, applyVariables, extractVariablesFromFiles, tokenizeTemplate } from "../lib/template";

describe("tokenizeTemplate", () => {
  it("splits literal text and variables in order", () => {
    expect(tokenizeTemplate("Hi {{name}}, do {{task:thing}}!")).toEqual([
      { type: "text", text: "Hi " },
      { type: "var", name: "name", default: "" },
      { type: "text", text: ", do " },
      { type: "var", name: "task", default: "thing" },
      { type: "text", text: "!" },
    ]);
  });

  it("handles text with no variables", () => {
    expect(tokenizeTemplate("plain text")).toEqual([{ type: "text", text: "plain text" }]);
  });

  it("handles a variable at the very start and end", () => {
    expect(tokenizeTemplate("{{a}}x{{b}}")).toEqual([
      { type: "var", name: "a", default: "" },
      { type: "text", text: "x" },
      { type: "var", name: "b", default: "" },
    ]);
  });
});

describe("extractVariables", () => {
  it("finds a bare variable", () => {
    expect(extractVariables("Write about {{topic}}.")).toEqual([{ name: "topic", default: "" }]);
  });

  it("captures a default value after a colon", () => {
    expect(extractVariables("Tone: {{tone:friendly}}")).toEqual([{ name: "tone", default: "friendly" }]);
  });

  it("returns multiple variables in order of first appearance", () => {
    expect(extractVariables("{{a}} then {{b:two}} then {{a}}")).toEqual([
      { name: "a", default: "" },
      { name: "b", default: "two" },
    ]);
  });

  it("dedupes by name and keeps a non-empty default seen anywhere", () => {
    expect(extractVariables("{{x}} and {{x:fallback}}")).toEqual([{ name: "x", default: "fallback" }]);
  });

  it("tolerates surrounding whitespace inside the braces", () => {
    expect(extractVariables("{{  name  }}")).toEqual([{ name: "name", default: "" }]);
  });

  it("returns an empty array when there are no variables", () => {
    expect(extractVariables("just plain text")).toEqual([]);
  });
});

describe("applyVariables", () => {
  it("substitutes provided values", () => {
    expect(applyVariables("Hi {{name}}", { name: "Ada" })).toBe("Hi Ada");
  });

  it("falls back to the default when a value is missing or empty", () => {
    expect(applyVariables("Tone: {{tone:friendly}}", {})).toBe("Tone: friendly");
    expect(applyVariables("Tone: {{tone:friendly}}", { tone: "" })).toBe("Tone: friendly");
  });

  it("replaces an unfilled variable with no default by an empty string", () => {
    expect(applyVariables("X={{x}}", {})).toBe("X=");
  });

  it("substitutes every occurrence", () => {
    expect(applyVariables("{{a}}-{{a}}", { a: "z" })).toBe("z-z");
  });
});

describe("extractVariablesFromFiles", () => {
  it("unions variables across files, deduped by name", () => {
    const files = [
      { content: "Use {{model:claude}} for {{task}}" },
      { content: "Repeat {{task}} carefully" },
    ];
    expect(extractVariablesFromFiles(files)).toEqual([
      { name: "model", default: "claude" },
      { name: "task", default: "" },
    ]);
  });
});
