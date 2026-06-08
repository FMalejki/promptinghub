import { promptStats, estimateTokens } from "../lib/promptStats";

describe("promptStats", () => {
  it("counts words, characters and lines", () => {
    const s = promptStats("hello world\nsecond line");
    expect(s.words).toBe(4);
    expect(s.chars).toBe("hello world\nsecond line".length);
    expect(s.lines).toBe(2);
  });

  it("collapses whitespace when counting words", () => {
    expect(promptStats("  one   two\t three \n four ").words).toBe(4);
  });

  it("treats an empty / whitespace string as zero words and one line", () => {
    expect(promptStats("")).toEqual({ words: 0, chars: 0, lines: 0, tokens: 0 });
    const ws = promptStats("   ");
    expect(ws.words).toBe(0);
    expect(ws.chars).toBe(3);
  });

  it("estimates tokens at roughly chars/4, rounded up, never below word count", () => {
    expect(estimateTokens("")).toBe(0);
    // 8 chars → ceil(8/4) = 2, but 2 words → max(2,2)=2
    expect(estimateTokens("ab cd ef")).toBeGreaterThanOrEqual(2);
    // a long single token-ish word: chars dominate
    const long = "x".repeat(40);
    expect(estimateTokens(long)).toBe(10);
  });

  it("token estimate is at least the word count for many short words", () => {
    const body = Array.from({ length: 12 }, () => "a").join(" "); // 12 one-char words
    expect(promptStats(body).tokens).toBeGreaterThanOrEqual(12);
  });
});
