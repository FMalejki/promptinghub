import { coverScale, clampOffset, sourceRect } from "../lib/crop";

describe("coverScale", () => {
  it("scales a wide image to fill a square frame on the limiting (height) axis", () => {
    // 2000×1000 into 500×500: width ratio .25, height ratio .5 → must use .5 to cover.
    expect(coverScale({ w: 2000, h: 1000 }, { w: 500, h: 500 })).toBe(0.5);
  });
  it("scales a tall image to fill a wide frame on the limiting (width) axis", () => {
    expect(coverScale({ w: 600, h: 1200 }, { w: 360, h: 188 })).toBeCloseTo(360 / 600, 5);
  });
  it("is defensive against a zero-sized image", () => {
    expect(coverScale({ w: 0, h: 0 }, { w: 100, h: 100 })).toBe(1);
  });
});

describe("clampOffset", () => {
  it("limits the pan so the image edge never enters the frame", () => {
    // image 1000 wide displayed, frame 500 → max pan is (1000-500)/2 = 250.
    expect(clampOffset(9999, 1000, 500)).toBe(250);
    expect(clampOffset(-9999, 1000, 500)).toBe(-250);
    expect(clampOffset(40, 1000, 500)).toBe(40);
  });
  it("pins to 0 when the image only just covers the frame", () => {
    expect(clampOffset(30, 500, 500)).toBe(0);
  });
});

describe("sourceRect", () => {
  it("crops the centred square out of a landscape image at cover scale", () => {
    const img = { w: 2000, h: 1000 };
    const frame = { w: 500, h: 500 };
    const scale = coverScale(img, frame); // 0.5
    const r = sourceRect(img, frame, scale, 0, 0);
    // A 1000×1000 square taken from the horizontal centre of the 2000×1000 image.
    expect(r.sw).toBe(1000);
    expect(r.sh).toBe(1000);
    expect(r.sx).toBe(500); // (2000 - 1000) / 2
    expect(r.sy).toBe(0);
  });
  it("shifts the source window when the user pans right, staying in bounds", () => {
    const img = { w: 2000, h: 1000 };
    const frame = { w: 500, h: 500 };
    const scale = coverScale(img, frame); // 0.5
    const r = sourceRect(img, frame, scale, 100, 0); // pan +100 display px
    expect(r.sx).toBe(300); // 500 - 100/scale = 500 - 200
    expect(r.sy).toBe(0);
    expect(r.sw).toBe(1000);
  });
  it("never returns a source rect outside the image", () => {
    const img = { w: 800, h: 800 };
    const frame = { w: 400, h: 400 };
    const scale = coverScale(img, frame); // 0.5
    const r = sourceRect(img, frame, scale, 99999, 99999); // absurd pan
    expect(r.sx).toBeGreaterThanOrEqual(0);
    expect(r.sy).toBeGreaterThanOrEqual(0);
    expect(r.sx + r.sw).toBeLessThanOrEqual(img.w + 1e-6);
    expect(r.sy + r.sh).toBeLessThanOrEqual(img.h + 1e-6);
  });
});
