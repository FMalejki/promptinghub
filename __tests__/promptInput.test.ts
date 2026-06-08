import { newPromptSchema } from "../lib/promptInput";

const base = { name: "Agent", description: "An agent", category: "Agents" };

describe("newPromptSchema", () => {
  it("accepts a legacy single body", () => {
    const r = newPromptSchema.safeParse({ ...base, body: "do the thing" });
    expect(r.success).toBe(true);
  });

  it("accepts a files array", () => {
    const r = newPromptSchema.safeParse({ ...base, files: [{ path: "a.py", content: "print(1)" }] });
    expect(r.success).toBe(true);
  });

  it("rejects when neither body nor files is provided", () => {
    expect(newPromptSchema.safeParse(base).success).toBe(false);
  });

  it("rejects an empty files array with no body", () => {
    expect(newPromptSchema.safeParse({ ...base, files: [] }).success).toBe(false);
  });

  it("rejects a blank body with no files", () => {
    expect(newPromptSchema.safeParse({ ...base, body: "   " }).success).toBe(false);
  });

  it("rejects a file with an empty path", () => {
    expect(newPromptSchema.safeParse({ ...base, files: [{ path: "", content: "x" }] }).success).toBe(false);
  });

  it("rejects a missing required field", () => {
    expect(newPromptSchema.safeParse({ description: "d", category: "c", body: "b" }).success).toBe(false);
  });

  it("rejects more than 50 files", () => {
    const files = Array.from({ length: 51 }, (_, i) => ({ path: `f${i}.txt`, content: "x" }));
    expect(newPromptSchema.safeParse({ ...base, files }).success).toBe(false);
  });
});
