// Clickjacking policy, kept pure so the per-path decision is unit-testable and
// the middleware stays a thin wrapper. Everything is locked to same-origin
// framing EXCEPT /embed/*, which must stay framable from any origin so the
// oEmbed iframe works on third-party sites (WordPress, Discord, …).

export type HeaderPair = { name: string; value: string };

export function isEmbedPath(pathname: string): boolean {
  return pathname === "/embed" || pathname.startsWith("/embed/");
}

export function frameHeaders(pathname: string): HeaderPair[] {
  if (isEmbedPath(pathname)) {
    // Explicitly allow framing anywhere; deliberately NO X-Frame-Options, whose
    // only cross-origin value (ALLOW-FROM) is deprecated/unsupported.
    return [{ name: "Content-Security-Policy", value: "frame-ancestors *" }];
  }
  return [
    { name: "X-Frame-Options", value: "SAMEORIGIN" },
    { name: "Content-Security-Policy", value: "frame-ancestors 'self'" },
  ];
}
