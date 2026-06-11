import { hslLuminance, coverInk, getPlaceholderImage } from "../lib/constants";

describe("hslLuminance", () => {
  it("ranks a bright yellow above a dark blue", () => {
    expect(hslLuminance(50, 80, 60)).toBeGreaterThan(hslLuminance(220, 60, 35));
  });
  it("returns 0 for black and ~1 for white", () => {
    expect(hslLuminance(0, 0, 0)).toBeCloseTo(0, 5);
    expect(hslLuminance(0, 0, 100)).toBeCloseTo(1, 5);
  });
});

describe("coverInk", () => {
  it("uses DARK ink on a bright gradient (fun=yellow bucket, hue 45)", () => {
    const ink = coverInk(45, 73);
    expect(ink.useDark).toBe(true);
    expect(ink.rgb).toBe("17,24,39");
  });

  it("uses WHITE ink on a dark gradient (code=blue bucket, hue 210)", () => {
    const ink = coverInk(210, 238);
    expect(ink.useDark).toBe(false);
    expect(ink.rgb).toBe("255,255,255");
  });

  it("always returns positive alphas", () => {
    for (const [h, h2] of [[45, 73], [210, 238], [150, 178], [330, 358]] as const) {
      const ink = coverInk(h, h2);
      expect(ink.glyphAlpha).toBeGreaterThan(0);
      expect(ink.dotMin).toBeGreaterThan(0);
      expect(ink.dotRange).toBeGreaterThan(0);
    }
  });
});

describe("getPlaceholderImage still produces a valid svg data uri", () => {
  it("returns a decodable svg with a gradient rect", () => {
    const uri = getPlaceholderImage("seed-123", "Coding");
    expect(uri.startsWith("data:image/svg+xml,")).toBe(true);
    const svg = decodeURIComponent(uri.slice("data:image/svg+xml,".length));
    expect(svg).toContain("<svg");
    expect(svg).toContain('fill="url(#g)"');
  });
});
