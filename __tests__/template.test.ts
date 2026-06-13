import { extractVariables, applyVariables, extractVariablesFromFiles, tokenizeTemplate, humanizeVarName, isLongValueVar } from "../lib/template";

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

  describe("with an activeNames set (only fill-in fields are substituted)", () => {
    it("leaves non-field {{tokens}} (code examples) verbatim", () => {
      const active = new Set(["topic"]);
      const text = "Write about {{topic}}.\n```js\nconst x = {{model_name}};\n```";
      expect(applyVariables(text, { topic: "AI" }, active)).toBe(
        "Write about AI.\n```js\nconst x = {{model_name}};\n```",
      );
    });
    it("leaves Handlebars control tokens like {{else}}/{{this}} intact", () => {
      const active = new Set(["fallback"]);
      const text = "{{#each x}}{{this}}{{else}}{{fallback}}{{/each}}";
      expect(applyVariables(text, { fallback: "none" }, active)).toBe("{{#each x}}{{this}}{{else}}none{{/each}}");
    });
    it("still applies a field's inline default when its value is empty", () => {
      const active = new Set(["tone"]);
      expect(applyVariables("Tone: {{tone:friendly}}, code {{x}}", {}, active)).toBe("Tone: friendly, code {{x}}");
    });
  });
});

describe("humanizeVarName", () => {
  it("turns snake_case / kebab-case into a sentence-case label", () => {
    expect(humanizeVarName("user_name")).toBe("User name");
    expect(humanizeVarName("target-audience")).toBe("Target audience");
  });
  it("splits camelCase", () => {
    expect(humanizeVarName("recipientEmail")).toBe("Recipient Email");
  });
  it("capitalizes a single bare word and tolerates empties", () => {
    expect(humanizeVarName("topic")).toBe("Topic");
    expect(humanizeVarName("")).toBe("");
  });
});

describe("isLongValueVar", () => {
  it("flags names that imply prose/code", () => {
    expect(isLongValueVar({ name: "description" })).toBe(true);
    expect(isLongValueVar({ name: "code_snippet" })).toBe(true);
    expect(isLongValueVar({ name: "user_message" })).toBe(true);
  });
  it("flags a default that is long or multi-line", () => {
    expect(isLongValueVar({ name: "x", default: "a".repeat(80) })).toBe(true);
    expect(isLongValueVar({ name: "x", default: "line1\nline2" })).toBe(true);
  });
  it("treats short token-like vars as single-line", () => {
    expect(isLongValueVar({ name: "tone" })).toBe(false);
    expect(isLongValueVar({ name: "topic", default: "AI" })).toBe(false);
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

  it("ignores Handlebars control tokens like {{else}} and {{this}}", () => {
    expect(extractVariables("{{#each items}}{{this}}{{else}}{{fallback}}{{/each}}")).toEqual([
      { name: "fallback", default: "" },
    ]);
  });

  it("ignores {{tokens}} that only appear inside code blocks", () => {
    const files = [
      { content: "Fill in {{tone}}.\n\n```js\nconst x = `{{installer_commit}}`; // {{generated_at}}\n```" },
    ];
    expect(extractVariablesFromFiles(files)).toEqual([{ name: "tone", default: "" }]);
  });

  it("returns [] when a prompt has more than MAX_CUSTOMIZE_VARS (it's a templating doc, not a form)", () => {
    const many = Array.from({ length: 20 }, (_, i) => `{{v${i}}}`).join(" ");
    expect(extractVariablesFromFiles([{ content: many }])).toEqual([]);
  });

  it("still returns a small, sane set for a real fill-in template", () => {
    const files = [{ content: "Write a {{tone}} email to {{recipient}} about {{topic}}." }];
    expect(extractVariablesFromFiles(files).map((v) => v.name)).toEqual(["tone", "recipient", "topic"]);
  });
});
