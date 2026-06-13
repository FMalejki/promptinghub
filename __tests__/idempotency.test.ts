import { timeBucket, normalizeViewer, ipViewerKey, VIEW_WINDOW_MS, COPY_WINDOW_MS } from "../lib/idempotency";

describe("timeBucket", () => {
  it("maps timestamps in the same window to the same bucket", () => {
    const base = 46296 * VIEW_WINDOW_MS; // bucket-aligned start
    expect(timeBucket(base, VIEW_WINDOW_MS)).toBe(timeBucket(base + VIEW_WINDOW_MS - 1, VIEW_WINDOW_MS));
  });

  it("advances to the next bucket after a full window", () => {
    const base = 46296 * VIEW_WINDOW_MS;
    expect(timeBucket(base + VIEW_WINDOW_MS, VIEW_WINDOW_MS)).toBe(timeBucket(base, VIEW_WINDOW_MS) + 1);
  });

  it("guards against bad input", () => {
    expect(timeBucket(NaN, COPY_WINDOW_MS)).toBe(0);
    expect(timeBucket(123, 0)).toBe(0);
    expect(timeBucket(123, -5)).toBe(0);
  });
});

describe("normalizeViewer", () => {
  it("accepts a sane hex-ish token", () => {
    expect(normalizeViewer("a1b2c3d4e5f6a7b8")).toBe("a1b2c3d4e5f6a7b8");
  });

  it("rejects junk / wrong-length / non-string", () => {
    expect(normalizeViewer("short")).toBe("");
    expect(normalizeViewer("has space here")).toBe("");
    expect(normalizeViewer("../etc")).toBe("");
    expect(normalizeViewer(null)).toBe("");
    expect(normalizeViewer(42 as unknown)).toBe("");
  });

  it("trims surrounding whitespace before validating", () => {
    expect(normalizeViewer("  a1b2c3d4e5f6  ")).toBe("a1b2c3d4e5f6");
  });
});

describe("ipViewerKey", () => {
  it("derives a stable, namespaced token that passes normalizeViewer", () => {
    const k = ipViewerKey("203.0.113.7");
    expect(k).toMatch(/^ip[0-9a-f]{8}$/);
    expect(normalizeViewer(k)).toBe(k); // usable as a viewer dedup key
  });

  it("is deterministic for the same IP and differs across IPs", () => {
    expect(ipViewerKey("203.0.113.7")).toBe(ipViewerKey("203.0.113.7"));
    expect(ipViewerKey("203.0.113.7")).not.toBe(ipViewerKey("203.0.113.8"));
  });

  it("returns '' for empty / unknown / non-string input", () => {
    expect(ipViewerKey("")).toBe("");
    expect(ipViewerKey("   ")).toBe("");
    expect(ipViewerKey("unknown")).toBe("");
    expect(ipViewerKey(null)).toBe("");
    expect(ipViewerKey(42 as unknown)).toBe("");
  });

  it("can never collide with a real anonId (always 'ip'-prefixed)", () => {
    expect(ipViewerKey("8.8.8.8").startsWith("ip")).toBe(true);
  });
});
