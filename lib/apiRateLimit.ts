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
