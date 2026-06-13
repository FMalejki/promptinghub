import { NextResponse } from "next/server";
import { getDb } from "./db";
import { rateLimit, clientIp } from "./rateLimit";

// Thin wrapper over the Mongo-backed fixed-window limiter (lib/rateLimit) for use
// inside route handlers. Returns a ready-to-return 429 response when the caller is
// over budget, or null to proceed. Keyed by a caller identity — the signed-in
// email when available, otherwise the client IP — so one abuser can't burn down
// the shared budget for everyone. Fails OPEN (the underlying limiter swallows DB
// errors), so a limiter hiccup never blocks legitimate traffic.
export async function enforceRateLimit(
  req: Request,
  bucket: string,
  limit: number,
  windowMs: number,
  who?: string | null,
): Promise<NextResponse | null> {
  const key = `${bucket}:${who || clientIp(req)}`;
  const rl = await rateLimit(await getDb(), key, limit, windowMs);
  if (rl.ok) return null;
  return NextResponse.json(
    { error: "Too many requests — please slow down and try again in a moment." },
    { status: 429, headers: { "Retry-After": String(Math.ceil(windowMs / 1000)) } },
  );
}

// Common windows so callers stay consistent.
export const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

// Hard, multi-layer limit for endpoints that spend a SHARED provider key (the AI
// import + playground routes run against one server-side Groq/LLM key). Three
// independent buckets, so no single vector can drain the key:
//   1. per-account — a generous-but-bounded budget for one signed-in user
//   2. per-IP      — catches one machine farming many throwaway Google accounts
//   3. global      — an absolute daily ceiling on TOTAL spend across everyone
// The first bucket over budget returns the 429; every layer fails OPEN on a
// limiter error, so a DB hiccup never blocks legitimate traffic.
export async function enforceAiRateLimit(req: Request, who?: string | null): Promise<NextResponse | null> {
  const ip = clientIp(req);
  return (
    (await enforceRateLimit(req, "ai-user", 20, HOUR, who || ip)) ||
    (await enforceRateLimit(req, "ai-ip", 40, HOUR, ip)) ||
    (await enforceRateLimit(req, "ai-global", 1500, DAY, "all"))
  );
}
