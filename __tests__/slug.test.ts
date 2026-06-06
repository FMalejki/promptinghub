import { slugify } from "../lib/slug";

describe("slugify", () => {
  it("lowercases and hyphenates words", () => {
    expect(slugify("Cold Outreach Email")).toBe("cold-outreach-email");
  });
  it("strips punctuation and parentheses", () => {
    expect(slugify("Cold Outreach Email (template)!")).toBe("cold-outreach-email-template");
  });
  it("collapses repeated separators and trims them", () => {
    expect(slugify("  Hello___World  ")).toBe("hello-world");
  });
  it("keeps the user's namespace example intact", () => {
    expect(slugify("night-shift agent")).toBe("night-shift-agent");
  });
  it("strips accents to ascii", () => {
    expect(slugify("Résumé Booster")).toBe("resume-booster");
  });
  it("falls back to 'prompt' for empty or symbol-only input", () => {
    expect(slugify("")).toBe("prompt");
    expect(slugify("@#$%")).toBe("prompt");
  });
});
