import { ogImagePath, ogTextParams } from "../lib/og";

describe("ogTextParams", () => {
  it("clamps the title and subtitle lengths", () => {
    const { title, subtitle } = ogTextParams("x".repeat(200), "y".repeat(400));
    expect(title.length).toBeLessThanOrEqual(80);
    expect(subtitle.length).toBeLessThanOrEqual(140);
  });

  it("defaults a missing subtitle to empty", () => {
    expect(ogTextParams("hi").subtitle).toBe("");
  });
});

describe("ogImagePath", () => {
  it("builds an encoded /api/og query string", () => {
    const p = ogImagePath("A & B", "say hi");
    expect(p.startsWith("/api/og?")).toBe(true);
    expect(p).toContain("title=A+%26+B");
    expect(p).toContain("subtitle=say+hi");
  });
});
