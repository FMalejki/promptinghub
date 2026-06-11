import { Db } from "mongodb";

// Per-category counts of PUBLIC prompts, so /browse can hide category pills that
// would dead-end on "No prompts found" and show an honest total.
export async function categoryCounts(db: Db): Promise<Record<string, number>> {
  const rows = await db
    .collection("prompts")
    .aggregate([
      { $match: { isPrivate: { $ne: true } } },
      { $group: { _id: "$category", count: { $sum: 1 } } },
    ])
    .toArray();
  const out: Record<string, number> = {};
  for (const r of rows) {
    if (typeof r._id === "string" && r._id) out[r._id] = r.count as number;
  }
  return out;
}

// Total across all categories (pure).
export function totalFromCounts(counts: Record<string, number>): number {
  return Object.values(counts).reduce((s, n) => s + (n || 0), 0);
}
