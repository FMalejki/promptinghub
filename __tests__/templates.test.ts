import { PROMPT_TEMPLATES, listTemplates, getTemplate } from "../lib/templates";
import { PROMPT_CATEGORIES } from "../lib/constants";

describe("prompt templates", () => {
  it("exposes a non-empty curated list", () => {
    expect(listTemplates().length).toBeGreaterThanOrEqual(8);
  });

  it("has unique ids", () => {
    const ids = PROMPT_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every template uses a valid category", () => {
    const valid = new Set<string>(PROMPT_CATEGORIES as readonly string[]);
    for (const t of PROMPT_TEMPLATES) {
      expect(valid.has(t.category)).toBe(true);
    }
  });

  it("every template has the fields the create form needs", () => {
    for (const t of PROMPT_TEMPLATES) {
      expect(t.promptName.trim().length).toBeGreaterThan(0);
      expect(t.description.trim().length).toBeGreaterThan(0);
      expect(t.body.trim().length).toBeGreaterThan(20);
      expect(Array.isArray(t.tags)).toBe(true);
      expect(t.emoji.trim().length).toBeGreaterThan(0);
    }
  });

  it("bodies carry at least one {{placeholder}} to fill in", () => {
    for (const t of PROMPT_TEMPLATES) {
      expect(/\{\{[a-z_]+\}\}/i.test(t.body)).toBe(true);
    }
  });

  it("getTemplate resolves a known id and returns undefined otherwise", () => {
    expect(getTemplate("cold-email")?.id).toBe("cold-email");
    expect(getTemplate("does-not-exist")).toBeUndefined();
  });
});
