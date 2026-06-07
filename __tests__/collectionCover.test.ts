import { collectionCover } from "../lib/collectionCover";

describe("collectionCover", () => {
  it("returns the first prompt image in saved order", () => {
    expect(
      collectionCover([
        { image: null },
        { image: "https://img/b.png" },
        { image: "https://img/c.png" },
      ])
    ).toBe("https://img/b.png");
  });

  it("returns null when no prompt has an image", () => {
    expect(collectionCover([{ image: null }, { image: undefined }, {}])).toBeNull();
  });

  it("returns null for an empty collection", () => {
    expect(collectionCover([])).toBeNull();
  });

  it("ignores blank/whitespace image strings", () => {
    expect(collectionCover([{ image: "" }, { image: "   " }, { image: "https://img/x.png" }])).toBe(
      "https://img/x.png"
    );
  });
});
