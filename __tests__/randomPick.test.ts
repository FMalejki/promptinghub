import { pickRandom } from "../lib/randomPick";

describe("pickRandom", () => {
  it("returns null for an empty list", () => {
    expect(pickRandom([], () => 0)).toBeNull();
  });

  it("picks by the rand fraction (floor of rand*length)", () => {
    const items = ["a", "b", "c", "d"];
    expect(pickRandom(items, () => 0)).toBe("a");
    expect(pickRandom(items, () => 0.25)).toBe("b");
    expect(pickRandom(items, () => 0.5)).toBe("c");
    expect(pickRandom(items, () => 0.99)).toBe("d");
  });

  it("clamps a rand of exactly 1 to the last item (no out-of-bounds)", () => {
    expect(pickRandom(["a", "b"], () => 1)).toBe("b");
  });

  it("defaults to a single-element pick", () => {
    expect(pickRandom(["only"])).toBe("only");
  });
});
