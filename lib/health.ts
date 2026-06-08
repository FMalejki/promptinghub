// Health-check payload for uptime monitors. Pure so the status mapping is
// unit-testable; the route does the actual DB ping and passes the result in.

export type HealthPayload = { ok: boolean; db: "up" | "down"; time: string };

export function healthPayload(dbOk: boolean, now: Date = new Date()): HealthPayload {
  return { ok: dbOk, db: dbOk ? "up" : "down", time: now.toISOString() };
}

// 200 when healthy, 503 when a dependency is down (so monitors alert).
export function healthStatus(dbOk: boolean): number {
  return dbOk ? 200 : 503;
}
