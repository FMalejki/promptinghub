// First-party, privacy-preserving product event logging. Pure validation/aggregation
// so it unit-tests cleanly; the route layer does the DB I/O. NO third-party tracker,
// NO PII: the server stamps `ts` and never stores IP/email; paths and prop values are
// run through the publish-gate (lib/sanitize) and rejected/dropped if they carry PII.
import { findSensitiveTokens } from "./sanitize";

export const EVENT_TYPES = [
  "page_view",
  "prompt_view",
  "prompt_copy",
  "search",
  "signup_click",
  "import_click",
  "cta_click",
] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export const MAX_PATH_LEN = 256;
export const MAX_PROP_KEYS = 8;
export const MAX_PROP_VAL_LEN = 120;

export type AnalyticsEvent = {
  type: EventType;
  path: string;
  ts: number;
  anonId: string;
  props?: Record<string, string | number | boolean>;
};

/** Client-generated opaque id: alphanumeric, bounded length, no PII shape. */
export function isValidAnonId(id: unknown): id is string {
  return typeof id === "string" && /^[A-Za-z0-9]{8,40}$/.test(id);
}

/**
 * Normalize a URL path for storage: drop the query string and hash (they can
 * carry tokens / PII), force a leading slash, cap length, and REJECT outright if
 * the remaining path trips the sensitive-token gate. Returns null when unusable.
 */
export function sanitizePath(input: unknown): string | null {
  if (typeof input !== "string") return null;
  let p = input.trim();
  if (!p) return null;
  p = p.split(/[?#]/)[0];
  if (!p.startsWith("/")) p = "/" + p;
  p = p.slice(0, MAX_PATH_LEN);
  if (findSensitiveTokens(p).length) return null;
  return p;
}

/**
 * Keep only safe, flat props: snake/camel keys, primitive values, bounded count
 * and string length. String values that trip the sensitive-token gate are dropped.
 */
export function sanitizeProps(input: unknown): Record<string, string | number | boolean> | undefined {
  if (!input || typeof input !== "object" || Array.isArray(input)) return undefined;
  const out: Record<string, string | number | boolean> = {};
  let n = 0;
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    if (n >= MAX_PROP_KEYS) break;
    if (!/^[A-Za-z0-9_]{1,32}$/.test(k)) continue;
    let val: string | number | boolean | null = null;
    if (typeof v === "number" && Number.isFinite(v)) val = v;
    else if (typeof v === "boolean") val = v;
    else if (typeof v === "string") {
      const s = v.slice(0, MAX_PROP_VAL_LEN);
      if (findSensitiveTokens(s).length) continue;
      val = s;
    }
    if (val === null) continue;
    out[k] = val;
    n++;
  }
  return n ? out : undefined;
}

/**
 * Validate + normalize a raw client payload into a storable event. The server
 * stamps `ts` (client clocks aren't trusted) and never accepts IP/email fields.
 */
export function validateEvent(
  input: unknown,
  now: number = Date.now(),
): { ok: true; event: AnalyticsEvent } | { ok: false; error: string } {
  if (!input || typeof input !== "object") return { ok: false, error: "not an object" };
  const o = input as Record<string, unknown>;
  if (!EVENT_TYPES.includes(o.type as EventType)) return { ok: false, error: "bad type" };
  const path = sanitizePath(o.path);
  if (!path) return { ok: false, error: "bad path" };
  if (!isValidAnonId(o.anonId)) return { ok: false, error: "bad anonId" };
  const props = sanitizeProps(o.props);
  return {
    ok: true,
    event: { type: o.type as EventType, path, ts: now, anonId: o.anonId, ...(props ? { props } : {}) },
  };
}

export type EventAggregate = {
  total: number;
  byType: Record<string, number>;
  topPaths: { path: string; count: number }[];
  uniqueVisitors: number;
};

/** Roll up stored events into top-line counts for the admin read. Pure. */
export function aggregateEvents(
  events: { type: string; path: string; anonId?: string }[],
  topN = 20,
): EventAggregate {
  const byType: Record<string, number> = {};
  const pathCount: Record<string, number> = {};
  const visitors = new Set<string>();
  for (const e of events) {
    byType[e.type] = (byType[e.type] || 0) + 1;
    pathCount[e.path] = (pathCount[e.path] || 0) + 1;
    if (e.anonId) visitors.add(e.anonId);
  }
  const topPaths = Object.entries(pathCount)
    .map(([path, count]) => ({ path, count }))
    .sort((a, b) => b.count - a.count || a.path.localeCompare(b.path))
    .slice(0, topN);
  return { total: events.length, byType, topPaths, uniqueVisitors: visitors.size };
}
