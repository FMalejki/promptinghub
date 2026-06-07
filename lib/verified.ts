// Verified creator handles. Seeded with the founders; extendable via the
// VERIFIED_HANDLES env var (comma-separated) without a code change.
const SEED = ["adriankrawczyk", "filipmalejki"];

function verifiedSet(): Set<string> {
  const extra = (process.env.VERIFIED_HANDLES || "")
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
  return new Set([...SEED, ...extra]);
}

export function isVerifiedHandle(handle: string): boolean {
  return verifiedSet().has(handle.trim().toLowerCase());
}
