import { buildWebManifest } from "../lib/webManifest";

describe("buildWebManifest", () => {
  it("declares an installable standalone app", () => {
    const m = buildWebManifest();
    expect(m.name).toBe("PromptingHub");
    expect(m.short_name).toBe("PromptingHub");
    expect(m.display).toBe("standalone");
    expect(m.start_url).toBe("/browse");
    expect(typeof m.theme_color).toBe("string");
    expect(typeof m.background_color).toBe("string");
  });

  it("ships at least one maskable icon", () => {
    const m = buildWebManifest();
    expect(Array.isArray(m.icons)).toBe(true);
    expect(m.icons!.length).toBeGreaterThan(0);
    expect(m.icons!.some((i) => (i.purpose || "").includes("maskable"))).toBe(true);
    for (const icon of m.icons!) {
      expect(icon.src).toBeTruthy();
      expect(icon.sizes).toMatch(/\d+x\d+/);
    }
  });
});
