import { parseLimit, parseOffset, nextOffset, MAX_PAGE_SIZE } from "../lib/pagination";

describe("parseLimit", () => {
  it("returns undefined when absent or invalid (→ unpaginated, full pool)", () => {
    expect(parseLimit(null)).toBeUndefined();
    expect(parseLimit("0")).toBeUndefined();
    expect(parseLimit("-5")).toBeUndefined();
    expect(parseLimit("abc")).toBeUndefined();
  });
  it("floors a valid positive size", () => {
    expect(parseLimit("24")).toBe(24);
    expect(parseLimit("12.9")).toBe(12);
  });
  it("caps at MAX_PAGE_SIZE to prevent abuse", () => {
    expect(parseLimit("100000")).toBe(MAX_PAGE_SIZE);
  });
});

describe("parseOffset", () => {
  it("defaults to 0 for absent/invalid/negative", () => {
    expect(parseOffset(null)).toBe(0);
    expect(parseOffset("-3")).toBe(0);
    expect(parseOffset("nope")).toBe(0);
  });
  it("floors a valid offset", () => {
    expect(parseOffset("48")).toBe(48);
    expect(parseOffset("48.7")).toBe(48);
  });
});

describe("nextOffset", () => {
  it("is null when unpaginated (no limit)", () => {
    expect(nextOffset(50, undefined, 0)).toBeNull();
  });
  it("advances when the page came back full (likely more)", () => {
    expect(nextOffset(24, 24, 0)).toBe(24);
    expect(nextOffset(24, 24, 24)).toBe(48);
  });
  it("is null when the page came back short (last page)", () => {
    expect(nextOffset(7, 24, 24)).toBeNull();
  });
});
