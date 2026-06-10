import { timingSafeEqual } from "node:crypto";

// Constant-time Bearer-token check for token-guarded admin endpoints
// (e.g. /api/admin/seed). Returns false unless an expected token is configured
// AND the request carries an exactly-matching `Authorization: Bearer <token>`.
// The comparison is length-checked then timing-safe to avoid leaking the token
// via response timing.
export function verifyBearerToken(authHeader: string | null | undefined, expected: string | undefined | null): boolean {
  if (!expected) return false; // endpoint is off unless a token is configured
  const header = authHeader || "";
  if (!header.startsWith("Bearer ")) return false;
  const provided = header.slice(7);
  if (!provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false; // timingSafeEqual throws on length mismatch
  return timingSafeEqual(a, b);
}
