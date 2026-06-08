import { COPY_FEEDBACK_MS, copyLabel } from "../lib/clipboard";

describe("clipboard helpers", () => {
  it("exposes a single shared feedback duration", () => {
    expect(COPY_FEEDBACK_MS).toBe(1500);
  });

  it("shows the idle label until copied", () => {
    expect(copyLabel(false, "Copy")).toBe("Copy");
    expect(copyLabel(true, "Copy")).toBe("Copied!");
  });

  it("supports a custom done label", () => {
    expect(copyLabel(false, "Embed")).toBe("Embed");
    expect(copyLabel(true, "Embed", "Embed copied!")).toBe("Embed copied!");
  });
});
