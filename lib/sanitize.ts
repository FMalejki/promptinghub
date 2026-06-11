// Publish-gate for any content sourced from a private/local environment before it
// is seeded to the PUBLIC site. Pure + deterministic so it unit-tests cleanly and
// can run as a hard gate in seed scripts. Conservative: false positives just force
// a human review; a miss would leak. When in doubt, this should fire.

export type SensitiveMatch = { kind: string; match: string };

const PATTERNS: { kind: string; re: RegExp }[] = [
  // Absolute user home paths (/Users/<name>, /home/<name>).
  { kind: "absolute-home-path", re: /\/(?:Users|home)\/[A-Za-z0-9._-]+/g },
  // Personal tooling paths that imply a private routine/client dir.
  { kind: "personal-tooling-path", re: /~\/[A-Za-z0-9._/-]*(?:routine|syncd)[A-Za-z0-9._/-]*/gi },
  // Email addresses.
  { kind: "email", re: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g },
  // Known private client / person names that must never appear publicly.
  { kind: "client-name", re: /\b(?:syncd|bgawkuc|gaweł|gawel|kucab)\b/gi },
  // Issue-tracker ticket ids (PROJ-1234) — 2+ trailing digits so model names
  // like "GPT-4" / "CLAUDE-3" do NOT trip the gate.
  { kind: "ticket-id", re: /\b[A-Z]{2,6}-\d{2,}\b/g },
  // Secret-ish assignments: token=, api_key:, password = …
  { kind: "secret-assignment", re: /\b(?:secret|token|api[_-]?key|password|passwd|access[_-]?key|private[_-]?key)\b\s*[:=]/gi },
  // dotenv files.
  { kind: "env-file", re: /\.env(?:\.[A-Za-z]+)?\b/g },
];

/** Return every sensitive token found in `text` (kind + the matched substring). */
export function findSensitiveTokens(text: string): SensitiveMatch[] {
  const out: SensitiveMatch[] = [];
  const t = text || "";
  for (const { kind, re } of PATTERNS) {
    for (const m of t.matchAll(re)) out.push({ kind, match: m[0] });
  }
  return out;
}

/** True only when `text` is free of every sensitive pattern — safe to publish. */
export function isPublishable(text: string): boolean {
  return findSensitiveTokens(text).length === 0;
}
