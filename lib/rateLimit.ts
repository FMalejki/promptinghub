import { Db } from "mongodb";

// A small fixed-window rate limiter backed by MongoDB, so it works across
// serverless instances (an in-memory limiter wouldn't, since each Vercel
// lambda has its own memory). Each (key, window) is a counter doc that the DB
// expires via a TTL index on `expireAt`. Best-effort: on any DB error it
// FAILS OPEN (allows the request) so a limiter hiccup never takes the site down.

export type RateLimitResult = { ok: boolean; remaining: number; limit: number };

let indexReady: Promise<void> | null = null;
async function ensureTtlIndex(db: Db): Promise<void> {
  if (!indexReady) {
    indexReady = db
      .collection("rateLimits")
      .createIndex({ expireAt: 1 }, { expireAfterSeconds: 0 })
      .then(() => undefined)
      .catch(() => {
        indexReady = null; // allow a later retry
      });
  }
  return indexReady;
}

// Extract a best-effort client IP from a request's proxy headers.
export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

/**
 * Count this hit against a fixed window and report whether it's within `limit`.
 * `now` is injectable for deterministic tests.
 */
export async function rateLimit(
  db: Db,
  key: string,
  limit: number,
  windowMs: number,
  now: number = Date.now(),
): Promise<RateLimitResult> {
  try {
    await ensureTtlIndex(db);
    const windowStart = Math.floor(now / windowMs) * windowMs;
    const _id = `${key}:${windowStart}`;
    const col = db.collection<{ _id: string; count: number; expireAt: Date }>("rateLimits");
    const res = await col.findOneAndUpdate(
      { _id },
      { $inc: { count: 1 }, $setOnInsert: { expireAt: new Date(windowStart + windowMs) } },
      { upsert: true, returnDocument: "after" },
    );
    const doc = (res as { value?: { count?: number } } | null)?.value ?? (res as { count?: number } | null);
    const count = typeof doc?.count === "number" ? doc.count : 1;
    return { ok: count <= limit, remaining: Math.max(0, limit - count), limit };
  } catch {
    // Fail open — never block legitimate traffic because of a limiter error.
    return { ok: true, remaining: limit, limit };
  }
}
