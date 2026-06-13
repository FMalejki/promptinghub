// Clickjacking policy, kept pure so the per-path decision is unit-testable and
// the middleware stays a thin wrapper. Everything is locked to same-origin
// framing EXCEPT /embed/*, which must stay framable from any origin so the
// oEmbed iframe works on third-party sites (WordPress, Discord, …).

export type HeaderPair = { name: string; value: string };

// Baseline hardening applied to every response (embed included): stop MIME
// sniffing, trim the Referer sent cross-origin, and deny powerful APIs the app
// never uses.
export const BASELINE_HEADERS: HeaderPair[] = [
  { name: "X-Content-Type-Options", value: "nosniff" },
  { name: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { name: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

export function isEmbedPath(pathname: string): boolean {
  return pathname === "/embed" || pathname.startsWith("/embed/");
}

// The full security header set for a path: baseline hardening + framing policy.
export function securityHeaders(pathname: string): HeaderPair[] {
  return [...BASELINE_HEADERS, ...frameHeaders(pathname)];
}

export function frameHeaders(pathname: string): HeaderPair[] {
  if (isEmbedPath(pathname)) {
    // Explicitly allow framing anywhere; deliberately NO X-Frame-Options, whose
    // only cross-origin value (ALLOW-FROM) is deprecated/unsupported.
    return [{ name: "Content-Security-Policy", value: `frame-ancestors *; ${BASE_CSP}` }];
  }
  return [
    { name: "X-Frame-Options", value: "SAMEORIGIN" },
    { name: "Content-Security-Policy", value: `frame-ancestors 'self'; ${BASE_CSP}` },
  ];
}

// CSP directives applied everywhere regardless of framing policy. The safe,
// no-nonce subset: block plugin/object embeds (a legacy XSS vector) and pin
// <base href> to our own origin so injected markup can't rewrite relative URLs.
// (A full script-src would need per-request nonces — out of scope here.)
const BASE_CSP = "object-src 'none'; base-uri 'self'";
