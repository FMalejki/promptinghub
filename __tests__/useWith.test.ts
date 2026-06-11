import { resolveUseWith, useWithFilter, useWithLabel, USE_WITH_VALUES } from "../lib/useWith";

describe("resolveUseWith", () => {
  it("passes through valid values", () => {
    for (const v of USE_WITH_VALUES) expect(resolveUseWith(v)).toBe(v);
  });
  it("is case-insensitive and trims", () => {
    expect(resolveUseWith("  Agent ")).toBe("agent");
    expect(resolveUseWith("CHAT")).toBe("chat");
  });
  it("defaults unknown / non-string to both", () => {
    expect(resolveUseWith("nope")).toBe("both");
    expect(resolveUseWith(undefined)).toBe("both");
    expect(resolveUseWith(5)).toBe("both");
    expect(resolveUseWith("")).toBe("both");
  });
});

describe("useWithFilter", () => {
  it("includes 'both' and null (legacy/missing field) alongside a specific target", () => {
    expect(useWithFilter("chat")).toEqual({ $in: ["chat", "both", null] });
    expect(useWithFilter("agent")).toEqual({ $in: ["agent", "both", null] });
  });
  it("returns undefined for 'both' / invalid (no narrowing)", () => {
    expect(useWithFilter("both")).toBeUndefined();
    expect(useWithFilter("garbage")).toBeUndefined();
    expect(useWithFilter(undefined)).toBeUndefined();
  });
});

describe("useWithLabel", () => {
  it("returns a labelled string per value", () => {
    expect(useWithLabel("chat")).toContain("Web chat");
    expect(useWithLabel("agent")).toContain("Coding agents");
    expect(useWithLabel("both")).toMatch(/Chat|agents/);
  });
});
