import { Db } from "mongodb";

export type PromptStats = {
  id: string;
  name: string;
  copyCount: number;
  stars: number;
  forkCount: number;
  isPrivate: boolean;
  createdAt: Date;
};
export type OwnerAnalytics = {
  totals: { prompts: number; copies: number; stars: number; forks: number };
  perPrompt: PromptStats[];
};

// Usage stats for everything `email` owns: copies, stars, and fork counts,
// per prompt (most-copied first) and totalled.
export async function ownerAnalytics(db: Db, email: string): Promise<OwnerAnalytics> {
  const rows = await db.collection("prompts").find({ ownerEmail: email }).toArray();

  // Fork counts: how many prompts reference each owned prompt as forkedFrom.
  const ids = rows.map((r) => r._id.toString());
  const forkAgg = ids.length
    ? await db
        .collection("prompts")
        .aggregate([{ $match: { forkedFrom: { $in: ids } } }, { $group: { _id: "$forkedFrom", n: { $sum: 1 } } }])
        .toArray()
    : [];
  const forksById = new Map(forkAgg.map((f: any) => [f._id as string, f.n as number]));

  const perPrompt: PromptStats[] = rows
    .map((r) => ({
      id: r._id.toString(),
      name: r.name,
      copyCount: r.copyCount || 0,
      stars: (r.starredBy || []).length,
      forkCount: forksById.get(r._id.toString()) || 0,
      isPrivate: !!r.isPrivate,
      createdAt: r.createdAt,
    }))
    .sort((a, b) => b.copyCount - a.copyCount || b.stars - a.stars);

  const totals = perPrompt.reduce(
    (acc, p) => ({
      prompts: acc.prompts + 1,
      copies: acc.copies + p.copyCount,
      stars: acc.stars + p.stars,
      forks: acc.forks + p.forkCount,
    }),
    { prompts: 0, copies: 0, stars: 0, forks: 0 },
  );

  return { totals, perPrompt };
}
