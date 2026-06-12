import { scorePromptMatch, rankBySearch } from "../lib/search";

const A = { id: "A", name: "Email writer", description: "general assistant", tags: ["writing"] };
const B = { id: "B", name: "Assistant", description: "writes a cold email for you", tags: [] };
const C = { id: "C", name: "Outreach helper", description: "general", tags: ["email"] };

describe("scorePromptMatch", () => {
  it("weights a name match above a tag match above a description match", () => {
    const sName = scorePromptMatch("email", A);
    const sTag = scorePromptMatch("email", C);
    const sDesc = scorePromptMatch("email", B);
    expect(sName).toBeGreaterThan(sTag);
    expect(sTag).toBeGreaterThan(sDesc);
  });

  it("is zero when nothing matches", () => {
    expect(scorePromptMatch("kubernetes", A)).toBe(0);
  });
});

describe("rankBySearch", () => {
  it("orders results name > tag > description for the query", () => {
    const ranked = rankBySearch("email", [B, C, A]);
    expect(ranked.map((p) => p.id)).toEqual(["A", "C", "B"]);
  });

  it("drops non-matching items", () => {
    const ranked = rankBySearch("email", [A, { id: "Z", name: "Nope", description: "x", tags: [] }]);
    expect(ranked.map((p) => p.id)).toEqual(["A"]);
  });
});

describe("scorePromptMatch — relevance refinements", () => {
  const exact = { id: "E", name: "Email", description: "", tags: [] };
  const contains = { id: "C2", name: "Email writer pro", description: "", tags: [] };

  it("ranks an exact name match above a name that merely contains the query", () => {
    expect(scorePromptMatch("email", exact)).toBeGreaterThan(scorePromptMatch("email", contains));
  });

  it("gives a prefix bonus when the name starts with the query", () => {
    const starts = { id: "S", name: "Regex builder", description: "", tags: [] };
    const mid = { id: "M", name: "Build a regex", description: "", tags: [] };
    expect(scorePromptMatch("regex", starts)).toBeGreaterThan(scorePromptMatch("regex", mid));
  });

  it("rewards a whole-word token over a mere substring", () => {
    const word = { id: "W", name: "cat facts", description: "", tags: [] };
    const sub = { id: "U", name: "category sorter", description: "", tags: [] };
    expect(scorePromptMatch("cat", word)).toBeGreaterThan(scorePromptMatch("cat", sub));
  });

  it("tolerates a single-character typo (fuzzy) for longer tokens", () => {
    const p = { id: "F", name: "Email writer", description: "", tags: [] };
    expect(scorePromptMatch("emial", p)).toBeGreaterThan(0); // transposition
    expect(scorePromptMatch("emai", p)).toBeGreaterThan(0); // deletion (also prefix)
  });

  it("does not fuzzy-match very short tokens (avoids noise)", () => {
    const p = { id: "G", name: "cat", description: "", tags: [] };
    expect(scorePromptMatch("dog", p)).toBe(0);
  });
});

describe("scorePromptMatch — synonyms", () => {
  it("matches a short form against the long form ('gpt' → ChatGPT)", () => {
    const p = { id: "S1", name: "ChatGPT system prompt", description: "", tags: [] };
    expect(scorePromptMatch("gpt", p)).toBeGreaterThan(0);
  });

  it("matches across image synonyms ('img' → image)", () => {
    const p = { id: "S2", name: "Image generator", description: "", tags: [] };
    expect(scorePromptMatch("img", p)).toBeGreaterThan(0);
  });

  it("ranks a direct name match above a synonym-only match", () => {
    const direct = { id: "D", name: "gpt helper", description: "", tags: [] };
    const synonym = { id: "Y", name: "ChatGPT helper", description: "", tags: [] };
    expect(scorePromptMatch("gpt", direct)).toBeGreaterThan(scorePromptMatch("gpt", synonym));
  });

  it("still scores zero when neither the term nor a synonym appears", () => {
    const p = { id: "Z", name: "Email writer", description: "general", tags: ["writing"] };
    expect(scorePromptMatch("kubernetes", p)).toBe(0);
  });

  it("matches prompt-domain intent synonyms ('summarize' → Summary, 'debug' → fix)", () => {
    expect(scorePromptMatch("summarize", { id: "S3", name: "Summary generator", description: "", tags: [] })).toBeGreaterThan(0);
    expect(scorePromptMatch("debug", { id: "S4", name: "Bug fix helper", description: "", tags: [] })).toBeGreaterThan(0);
    expect(scorePromptMatch("translate", { id: "S5", name: "Translation tool", description: "", tags: [] })).toBeGreaterThan(0);
  });
});
