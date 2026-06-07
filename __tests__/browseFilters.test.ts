import { hasActiveFilters } from "../lib/browseFilters";

describe("hasActiveFilters", () => {
  it("is false when nothing is set", () => {
    expect(hasActiveFilters({})).toBe(false);
    expect(hasActiveFilters({ q: "", category: null, tag: null, imageOnly: false })).toBe(false);
  });

  it("is true when a search query is present", () => {
    expect(hasActiveFilters({ q: "email" })).toBe(true);
  });

  it("treats a whitespace-only query as no query", () => {
    expect(hasActiveFilters({ q: "   " })).toBe(false);
  });

  it("is true for a category, tag, or image-only filter", () => {
    expect(hasActiveFilters({ category: "Writing" })).toBe(true);
    expect(hasActiveFilters({ tag: "seo" })).toBe(true);
    expect(hasActiveFilters({ imageOnly: true })).toBe(true);
  });
});
