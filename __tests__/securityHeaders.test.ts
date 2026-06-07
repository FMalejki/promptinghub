import { isEmbedPath, frameHeaders, securityHeaders } from "../lib/securityHeaders";

describe("securityHeaders", () => {
  it("applies baseline hardening on every path, plus same-origin framing on normal pages", () => {
    const byName = Object.fromEntries(securityHeaders("/browse").map((x) => [x.name, x.value]));
    expect(byName["X-Content-Type-Options"]).toBe("nosniff");
    expect(byName["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(byName["Permissions-Policy"]).toContain("geolocation=()");
    expect(byName["X-Frame-Options"]).toBe("SAMEORIGIN");
  });

  it("applies baseline hardening to the embed route while keeping it framable", () => {
    const byName = Object.fromEntries(securityHeaders("/embed/abc").map((x) => [x.name, x.value]));
    expect(byName["X-Content-Type-Options"]).toBe("nosniff");
    expect(byName["Content-Security-Policy"]).toBe("frame-ancestors *");
    expect(byName["X-Frame-Options"]).toBeUndefined();
  });
});

describe("isEmbedPath", () => {
  it("is true for the embed route and its children", () => {
    expect(isEmbedPath("/embed/6a246476f014ab933b615829")).toBe(true);
    expect(isEmbedPath("/embed")).toBe(true);
  });
  it("is false for every other route", () => {
    expect(isEmbedPath("/browse")).toBe(false);
    expect(isEmbedPath("/prompt/abc")).toBe(false);
    expect(isEmbedPath("/embedded-thing")).toBe(false); // not the embed route
    expect(isEmbedPath("/")).toBe(false);
  });
});

describe("frameHeaders", () => {
  it("locks normal pages to same-origin framing (clickjacking protection)", () => {
    const h = frameHeaders("/login");
    const byName = Object.fromEntries(h.map((x) => [x.name, x.value]));
    expect(byName["X-Frame-Options"]).toBe("SAMEORIGIN");
    expect(byName["Content-Security-Policy"]).toBe("frame-ancestors 'self'");
  });

  it("leaves the embed route framable from any origin (oEmbed must work cross-site)", () => {
    const h = frameHeaders("/embed/abc123");
    const byName = Object.fromEntries(h.map((x) => [x.name, x.value]));
    // No X-Frame-Options (it has no allow-list value and would block cross-origin frames).
    expect(byName["X-Frame-Options"]).toBeUndefined();
    expect(byName["Content-Security-Policy"]).toBe("frame-ancestors *");
  });
});
