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
