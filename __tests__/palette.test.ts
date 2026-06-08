import { nextIndex } from "../lib/palette";

describe("nextIndex", () => {
  it("moves forward and wraps", () => {
    expect(nextIndex(0, 3, 1)).toBe(1);
    expect(nextIndex(2, 3, 1)).toBe(0);
  });
  it("moves backward and wraps", () => {
    expect(nextIndex(0, 3, -1)).toBe(2);
    expect(nextIndex(1, 3, -1)).toBe(0);
  });
  it("returns -1 for an empty list", () => {
    expect(nextIndex(0, 0, 1)).toBe(-1);
    expect(nextIndex(-1, 0, -1)).toBe(-1);
  });
});
