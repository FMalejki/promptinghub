// security.txt (RFC 9116) for responsible disclosure. `now` is injectable so the
// one-year Expires is deterministic in tests; the route passes the request time.
export function buildSecurityTxt(baseUrl: string, now: Date = new Date()): string {
  const base = baseUrl.replace(/\/$/, "");
  const expires = new Date(now);
  expires.setUTCFullYear(expires.getUTCFullYear() + 1);
  return [
    "Contact: mailto:security@promptinghub.app",
    `Expires: ${expires.toISOString()}`,
    "Preferred-Languages: en",
    `Canonical: ${base}/.well-known/security.txt`,
    `Policy: ${base}/security-policy`,
    "",
  ].join("\n");
}
