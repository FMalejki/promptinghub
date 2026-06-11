import { addNeutralModel, ModelSummary, summarizeCardAttestation } from "../lib/attestations";

const voted: ModelSummary = { modelId: "gpt-4o", works: 3, broken: 1, mixed: 0, youVoted: "works" };

const sum = (modelId: string, works: number, mixed: number, broken: number): ModelSummary => ({
  modelId,
  works,
  mixed,
  broken,
  youVoted: null,
});

describe("summarizeCardAttestation", () => {
  it("returns null when there is no community signal", () => {
    expect(summarizeCardAttestation([])).toBeNull();
    expect(summarizeCardAttestation([sum("gpt-4o", 0, 0, 0)])).toBeNull(); // neutral rows ignored
  });

  it("aggregates counts across models and counts only voted models", () => {
    const r = summarizeCardAttestation([sum("gpt-4o", 3, 1, 0), sum("claude", 2, 0, 1), sum("gemini", 0, 0, 0)]);
    expect(r).toEqual({ verdict: "works", works: 5, mixed: 1, broken: 1, models: 2 });
  });

  it("picks the dominant verdict", () => {
    expect(summarizeCardAttestation([sum("m", 0, 0, 4)])!.verdict).toBe("broken");
    expect(summarizeCardAttestation([sum("m", 1, 5, 1)])!.verdict).toBe("mixed");
    expect(summarizeCardAttestation([sum("m", 9, 1, 1)])!.verdict).toBe("works");
  });

  it("breaks ties toward the more positive verdict (works > mixed > broken)", () => {
    expect(summarizeCardAttestation([sum("m", 2, 2, 0)])!.verdict).toBe("works"); // works ties mixed → works
    expect(summarizeCardAttestation([sum("m", 0, 3, 3)])!.verdict).toBe("mixed"); // mixed ties broken → mixed
  });
});

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
