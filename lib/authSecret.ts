// A stable, insecure secret used ONLY outside production so local dev / test runs
// never crash with NextAuth's NO_SECRET error. Production must supply a real one.
export const DEV_FALLBACK_SECRET = "promptinghub-dev-insecure-secret-do-not-use-in-prod";

// Resolve the NextAuth secret. Returns the configured secret when present;
// otherwise a dev fallback outside production, or undefined in production
// (so a real misconfiguration still surfaces loudly instead of running insecure).
export function resolveAuthSecret(env: { NEXTAUTH_SECRET?: string; NODE_ENV?: string }): string | undefined {
  const configured = env.NEXTAUTH_SECRET?.trim();
  if (configured) return configured;
  if (env.NODE_ENV !== "production") return DEV_FALLBACK_SECRET;
  return undefined;
}
