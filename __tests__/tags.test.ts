import { normalizeTags } from "../lib/tags";

describe("normalizeTags", () => {
  it("accepts a comma- or whitespace-separated string", () => {
    expect(normalizeTags("Cold Email, gpt-4 , Marketing")).toEqual(["cold-email", "gpt-4", "marketing"]);
    expect(normalizeTags("seo  copywriting")).toEqual(["seo", "copywriting"]);
  });

  it("accepts an array and normalizes each entry", () => {
    expect(normalizeTags(["  SEO ", "Cold Email", "seo"])).toEqual(["seo", "cold-email"]);
  });

  it("lowercases, hyphenates spaces, and strips disallowed punctuation", () => {
    expect(normalizeTags("C++ , c#, Node.js, hello!world")).toEqual(["c++", "c#", "node.js", "helloworld"]);
  });

  it("dedupes and drops empties", () => {
    expect(normalizeTags("a, a, , b,")).toEqual(["a", "b"]);
    expect(normalizeTags("")).toEqual([]);
    expect(normalizeTags([])).toEqual([]);
  });

  it("caps at 10 tags and 30 chars each", () => {
    const many = Array.from({ length: 15 }, (_, i) => `tag${i}`);
    expect(normalizeTags(many)).toHaveLength(10);
    const long = "a".repeat(50);
    expect(normalizeTags([long])[0]).toHaveLength(30);
  });

  it("ignores non-string junk in arrays", () => {
    expect(normalizeTags(["ok", null as any, 5 as any, undefined as any])).toEqual(["ok"]);
  });
});
