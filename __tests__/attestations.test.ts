import { addNeutralModel, ModelSummary } from "../lib/attestations";

const voted: ModelSummary = { modelId: "gpt-4o", works: 3, broken: 1, mixed: 0, youVoted: "works" };

describe("addNeutralModel", () => {
  it("appends a neutral row (zero counts, no vote) for a new model", () => {
    const next = addNeutralModel([voted], "claude-3-5-sonnet");
    expect(next).toHaveLength(2);
    expect(next[1]).toEqual({
      modelId: "claude-3-5-sonnet",
      works: 0,
      broken: 0,
      mixed: 0,
      youVoted: null,
    });
    // does NOT presuppose a "works" verdict
    expect(next[1].youVoted).toBeNull();
    expect(next[1].works).toBe(0);
  });

  it("preserves existing rows", () => {
    const next = addNeutralModel([voted], "gemini-1.5-pro");
    expect(next[0]).toEqual(voted);
  });

  it("is a no-op when the model is already listed (no duplicates)", () => {
    const list = [voted];
    const next = addNeutralModel(list, "gpt-4o");
    expect(next).toBe(list); // unchanged reference
    expect(next).toHaveLength(1);
  });

  it("is a no-op for an empty modelId", () => {
    const list = [voted];
    expect(addNeutralModel(list, "")).toBe(list);
  });
});
