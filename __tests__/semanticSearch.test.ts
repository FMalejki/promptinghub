import { cosineSimilarity, embeddingTextFor } from "../lib/embeddings";
import { scoreHybrid, hybridRank, DEFAULT_SEMANTIC } from "../lib/semanticSearch";

describe("cosineSimilarity", () => {
  it("is 1 for identical, 0 for orthogonal, -1 for opposite vectors", () => {
    expect(cosineSimilarity([1, 0, 0], [1, 0, 0])).toBeCloseTo(1, 6);
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0, 6);
    expect(cosineSimilarity([1, 0], [-1, 0])).toBeCloseTo(-1, 6);
  });
  it("is scale-invariant (normalizes defensively)", () => {
    expect(cosineSimilarity([2, 0], [5, 0])).toBeCloseTo(1, 6);
  });
  it("returns 0 for mismatched, empty, or zero vectors", () => {
    expect(cosineSimilarity([1, 2, 3], [1, 2])).toBe(0);
    expect(cosineSimilarity([], [])).toBe(0);
    expect(cosineSimilarity([0, 0], [0, 0])).toBe(0);
  });
});

describe("embeddingTextFor", () => {
  it("joins title, description and tags into one searchable string", () => {
    expect(embeddingTextFor({ name: "Summarizer", description: "Shortens text", tags: ["writing", "tldr"] })).toBe(
      "Summarizer. Shortens text. writing. tldr",
    );
  });
  it("skips blank parts", () => {
    expect(embeddingTextFor({ name: "Only name" })).toBe("Only name");
    expect(embeddingTextFor({})).toBe("");
  });
});

describe("hybrid search ranking", () => {
  // Synonym-free prompts so keyword vs semantic contributions stay isolated
  // (e.g. "recap" would synonym-match "summarize" — avoided here on purpose).
  const prompts = [
    { id: "a", name: "Summarize an article", description: "condense long text", tags: ["writing"] },
    { id: "b", name: "Quantum computing intro", description: "qubits and superposition", tags: ["physics"] },
    { id: "c", name: "Photosynthesis explainer", description: "how plants make energy", tags: ["biology"] },
  ];

  it("falls back to pure keyword ranking when there is no query embedding", () => {
    const ranked = hybridRank("summarize", prompts, null, new Map());
    expect(ranked[0].id).toBe("a"); // only keyword match
    expect(ranked.map((p) => p.id)).not.toContain("b");
  });

  it("surfaces a semantically-related prompt that shares NO keyword or synonym", () => {
    // Query "machine learning" shares no word/synonym with any prompt; only the
    // embedding links it to "b" (quantum computing) here.
    const q = [1, 0, 0];
    const emb = new Map<string, number[]>([
      ["a", [0.1, 0.99, 0]], // unrelated direction
      ["b", [0.95, 0.31, 0]], // ~cos 0.95 with q → strong semantic hit
      ["c", [0, 0, 1]], // orthogonal
    ]);
    const ranked = scoreHybrid("machine learning", prompts, q, emb);
    const ids = ranked.map((r) => r.item.id);
    expect(ids).toContain("b"); // semantic-only match qualifies (no shared word)
    expect(ids).not.toContain("c"); // orthogonal stays out
    expect(ranked.find((r) => r.item.id === "b")!.keyword).toBe(0); // truly semantic-only
    expect(ranked.find((r) => r.item.id === "b")!.cosine).toBeGreaterThan(DEFAULT_SEMANTIC.floor);
  });

  it("keeps an exact keyword hit ranked above a moderate semantic-only one", () => {
    const q = [1, 0, 0];
    const emb = new Map<string, number[]>([
      ["a", [0, 1, 0]], // exact keyword match for 'summarize', no semantic
      ["b", [0.6, 0.8, 0]], // realistic moderate semantic (~cos 0.6), no keyword
      ["c", [0, 0, 1]],
    ]);
    const ranked = hybridRank("summarize", prompts, q, emb);
    expect(ranked[0].id).toBe("a"); // keyword (~20) beats moderate semantic (~10)
  });
});
