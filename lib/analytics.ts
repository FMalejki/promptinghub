import { Db } from "mongodb";

// Daily copy counts for an owner's prompts over the last `days` days (UTC),
// oldest → newest, zero-filled. `now` is injectable for deterministic tests.
export async function copyTimeseries(
  db: Db,
  email: string,
  days = 14,
  now: Date = new Date(),
): Promise<{ day: string; count: number }[]> {
  const owned = await db.collection("prompts").find({ ownerEmail: email }, { projection: { _id: 1 } }).toArray();
  const ids = owned.map((p) => p._id.toString());

  // Build the ordered list of day strings in the window.
  const dayList: string[] = [];
  const startMs = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - (days - 1) * 86400000;
  for (let i = 0; i < days; i++) {
    dayList.push(new Date(startMs + i * 86400000).toISOString().slice(0, 10));
  }
  const counts = new Map<string, number>(dayList.map((d) => [d, 0]));

  if (ids.length) {
    const events = await db
      .collection("copyEvents")
      .find({ promptId: { $in: ids }, createdAt: { $gte: new Date(startMs) } })
      .toArray();
    for (const e of events) {
      const day = new Date(e.createdAt).toISOString().slice(0, 10);
      if (counts.has(day)) counts.set(day, (counts.get(day) || 0) + 1);
    }
  }

  return dayList.map((day) => ({ day, count: counts.get(day) || 0 }));
}

export type ActivityPoint = { day: string; copies: number; views: number };

// Daily copies AND views for an owner's prompts over the last `days` days (UTC),
// oldest → newest, zero-filled. Powers the dashboard's switchable activity chart:
// the client derives "activity" (copies + views) or either metric alone. `now`
// is injectable for deterministic tests.
export async function activityTimeseries(
  db: Db,
  email: string,
  days = 14,
  now: Date = new Date(),
): Promise<ActivityPoint[]> {
  const owned = await db.collection("prompts").find({ ownerEmail: email }, { projection: { _id: 1 } }).toArray();
  const ids = owned.map((p) => p._id.toString());

  const dayList: string[] = [];
  const startMs = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - (days - 1) * 86400000;
  for (let i = 0; i < days; i++) {
    dayList.push(new Date(startMs + i * 86400000).toISOString().slice(0, 10));
  }
  const copies = new Map<string, number>(dayList.map((d) => [d, 0]));
  const views = new Map<string, number>(dayList.map((d) => [d, 0]));

  if (ids.length) {
    const since = new Date(startMs);
    const tally = async (collection: string, into: Map<string, number>) => {
      const events = await db.collection(collection).find({ promptId: { $in: ids }, createdAt: { $gte: since } }).toArray();
      for (const e of events) {
        const day = new Date(e.createdAt).toISOString().slice(0, 10);
        if (into.has(day)) into.set(day, (into.get(day) || 0) + 1);
      }
    };
    await tally("copyEvents", copies);
    await tally("viewEvents", views);
  }

  return dayList.map((day) => ({ day, copies: copies.get(day) || 0, views: views.get(day) || 0 }));
}

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
