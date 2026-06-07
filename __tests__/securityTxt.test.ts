import { buildSecurityTxt } from "../lib/securityTxt";

const base = "https://promptinghub.app";
const now = new Date("2026-06-07T00:00:00Z");

describe("buildSecurityTxt", () => {
  it("includes Contact and a future Expires (RFC 9116)", () => {
    const txt = buildSecurityTxt(base, now);
    expect(txt).toContain("Contact: mailto:security@promptinghub.app");
    // Expires one year out
    expect(txt).toContain("Expires: 2027-06-07T00:00:00.000Z");
  });

  it("references the canonical url and a policy page", () => {
    const txt = buildSecurityTxt(base, now);
    expect(txt).toContain(`Canonical: ${base}/.well-known/security.txt`);
    expect(txt).toContain(`Policy: ${base}/security-policy`);
  });

  it("trims a trailing slash on the base url", () => {
    expect(buildSecurityTxt(`${base}/`, now)).toContain(`Canonical: ${base}/.well-known/security.txt`);
  });
});
