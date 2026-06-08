import { lintPrompt } from "../lib/promptLint";

describe("lintPrompt", () => {
  it("rewards a well-formed prompt with a high score and passing checks", () => {
    const text = [
      "You are a senior technical writer.",
      "Rewrite the user's draft to be concise and clear.",
      "For example, replace passive voice with active voice.",
      "Return the result as a Markdown bulleted list, at most 5 bullets.",
    ].join("\n");

    const result = lintPrompt(text);

    expect(result.score).toBeGreaterThanOrEqual(80);
    const byId = Object.fromEntries(result.checks.map((c) => [c.id, c]));
    expect(byId.role.pass).toBe(true); // "You are a..."
    expect(byId.examples.pass).toBe(true); // "For example"
    expect(byId.format.pass).toBe(true); // "Markdown bulleted list"
    expect(byId.constraints.pass).toBe(true); // "at most 5"
    expect(byId.todo.pass).toBe(true); // no TODO markers => passes
    expect(byId.length.pass).toBe(true);
  });

  it("flags an empty or trivially short prompt", () => {
    const result = lintPrompt("  hi  ");
    expect(result.score).toBeLessThan(40);
    const length = result.checks.find((c) => c.id === "length")!;
    expect(length.pass).toBe(false);
    expect(length.severity).toBe("warn");
    expect(length.hint).toBeTruthy();
  });

  it("treats an empty string as the lowest possible signal", () => {
    const result = lintPrompt("");
    expect(result.score).toBe(0);
    expect(result.checks.find((c) => c.id === "length")!.pass).toBe(false);
  });

  it("warns about unfinished TODO/FIXME markers", () => {
    const result = lintPrompt(
      "You are a helpful assistant. TODO: decide the output format later."
    );
    const todo = result.checks.find((c) => c.id === "todo")!;
    expect(todo.pass).toBe(false);
    expect(todo.severity).toBe("warn");
  });

  it("warns about vague filler language", () => {
    const result = lintPrompt(
      "Do something useful with the stuff and etc. and so on, you know."
    );
    const vague = result.checks.find((c) => c.id === "specificity")!;
    expect(vague.pass).toBe(false);
  });

  it("detects reusable {{variable}} placeholders as an info-level positive", () => {
    const withVars = lintPrompt("You are a translator. Translate {{text}} into {{language}}.");
    const without = lintPrompt("You are a translator. Translate the text into Spanish.");
    expect(withVars.checks.find((c) => c.id === "variables")!.pass).toBe(true);
    expect(without.checks.find((c) => c.id === "variables")!.pass).toBe(false);
  });

  it("clamps the score to the 0..100 range and returns a stable check set", () => {
    const a = lintPrompt("anything");
    expect(a.score).toBeGreaterThanOrEqual(0);
    expect(a.score).toBeLessThanOrEqual(100);
    // The check ids are stable so the UI can render a fixed row set.
    expect(a.checks.map((c) => c.id).sort()).toEqual(
      ["constraints", "examples", "format", "length", "role", "specificity", "todo", "variables"].sort()
    );
  });
});
