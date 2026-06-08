import { Db, ObjectId } from "mongodb";
import { slugify } from "./slug";
import { IMAGE_MODEL_IDS } from "./imageModels";
import { normalizeTags } from "./tags";
import { promptToText } from "./promptText";
import { estimateTokens } from "./promptStats";

export type Author = { email: string; name: string; image: string | null };

export type TestedModel = {
  modelId: string;
  version?: string;
  notes?: string;
};

export type PromptFile = { path: string; content: string; language: string };

export type Prompt = {
  id: string;
  name: string;
  description: string;
  category: string;
  author: Author;
  image: string | null;
  stars: number;
  isPrivate: boolean;
  testedModels: TestedModel[];
  copyCount: number;
  priceCents: number;
  tags: string[];
  createdAt: Date;
  tokens?: number; // rough length estimate for the card badge (optional)
};

export type PromptWithBody = {
  id: string;
  name: string;
  description: string;
  category: string;
  body: string;
  ownerEmail: string;
  image: string | null;
  stars: number;
  isPrivate: boolean;
  sharedWith: string[];
  starredBy: string[];
  testedModels: TestedModel[];
  createdAt: Date;
};

export type PromptDetail = {
  id: string;
  name: string;
  description: string;
  category: string;
  body: string;
  files: PromptFile[];
  author: Author;
  image: string | null;
  stars: number;
  isPrivate: boolean;
  testedModels: TestedModel[];
  copyCount: number;
  viewCount: number;
  priceCents: number;
  tags: string[];
  forkedFrom: { id: string; name: string } | null;
  forkCount: number;
  createdAt: Date;
  updatedAt: Date | null;
  // Whether the viewer (if any) has starred this prompt — set from viewerEmail.
  isStarred: boolean;
  // Present when the owner has a handle and the prompt has a slug (see getPromptDetail).
  handle?: string;
  slug?: string;
};

export type NamespacedPromptDetail = PromptDetail & { handle: string; slug: string };

export type ListOpts = {
  q?: string;
  category?: string;
  model?: string;
  imageOnly?: boolean;
  tag?: string;
  ownerEmail?: string;
  sort?: "recent" | "popular" | "copied" | "trending" | "viewed";
  includePrivate?: boolean;
  userEmail?: string;
  // Optional pagination. When omitted, the full matching pool is returned
  // (backward compatible — sitemap/feeds/profile rely on this).
  limit?: number;
  skip?: number;
};

export type NewPromptFile = { path: string; content: string; language?: string };

export type NewPrompt = {
  name: string;
  description: string;
  category: string;
  body?: string;
  files?: NewPromptFile[];
  image?: string;
  isPrivate?: boolean;
  testedModels?: TestedModel[];
  priceCents?: number;
  tags?: string[] | string;
  forkedFrom?: string;
};

const LANG_BY_EXT: Record<string, string> = {
  ts: "typescript", tsx: "tsx", js: "javascript", jsx: "jsx", mjs: "javascript", cjs: "javascript",
  py: "python", rb: "ruby", go: "go", rs: "rust", java: "java", kt: "kotlin", swift: "swift",
  c: "c", h: "c", cpp: "cpp", cs: "csharp", php: "php",
  yaml: "yaml", yml: "yaml", json: "json", toml: "toml", xml: "xml", csv: "csv",
  md: "markdown", mdx: "markdown", txt: "text", text: "text",
  sh: "shell", bash: "shell", zsh: "shell",
  html: "html", css: "css", scss: "scss", sql: "sql", env: "text",
};

export function languageFromPath(path: string): string {
  const ext = path.toLowerCase().split(".").pop() || "";
  return LANG_BY_EXT[ext] || "text";
}

export function normalizeFiles(row: { files?: PromptFile[]; body?: string }): PromptFile[] {
  if (Array.isArray(row.files) && row.files.length) {
    return row.files.map((f) => ({ path: f.path, content: f.content, language: f.language || languageFromPath(f.path) }));
  }
  return [{ path: "prompt.txt", content: row.body ?? "", language: "text" }];
}

export async function listPrompts(db: Db, opts: ListOpts = {}): Promise<Prompt[]> {
  const match: Record<string, unknown> = {};
  // Each OR-group is ANDed together so privacy / image / search filters never clobber each other.
  const orGroups: Record<string, unknown>[][] = [];

  // Privacy filter
  if (!opts.includePrivate) {
    match.isPrivate = { $ne: true };
  } else if (opts.userEmail) {
    orGroups.push([
      { isPrivate: { $ne: true } },
      { ownerEmail: opts.userEmail },
      { sharedWith: opts.userEmail },
    ]);
  }

  if (opts.ownerEmail) match.ownerEmail = opts.ownerEmail;
  if (opts.category) match.category = opts.category;
  if (opts.model) match["testedModels.modelId"] = opts.model;
  if (opts.tag) {
    const t = normalizeTags(opts.tag)[0];
    if (t) match.tags = t;
  }
  if (opts.imageOnly) {
    orGroups.push([
      { category: { $regex: "^image generation$", $options: "i" } },
      { "testedModels.modelId": { $in: [...IMAGE_MODEL_IDS] } },
    ]);
  }
  if (opts.q) {
    const rx = { $regex: opts.q, $options: "i" };
    orGroups.push([{ name: rx }, { description: rx }, { tags: rx }]);
  }

  if (orGroups.length === 1) {
    match.$or = orGroups[0];
  } else if (orGroups.length > 1) {
    match.$and = orGroups.map((g) => ({ $or: g }));
  }

  const sortField =
    opts.sort === "popular"
      ? { stars: -1, createdAt: -1 }
      : opts.sort === "copied"
      ? { copyCount: -1, createdAt: -1 }
      : opts.sort === "trending"
      ? { trendingScore: -1, createdAt: -1 }
      : opts.sort === "viewed"
      ? { viewCount: -1, createdAt: -1 }
      : { createdAt: -1, _id: -1 };

  const pipeline: Record<string, unknown>[] = [
    { $match: match },
    {
      $addFields: {
        stars: { $size: { $ifNull: ["$starredBy", []] } },
        copyCount: { $ifNull: ["$copyCount", 0] },
        viewCount: { $ifNull: ["$viewCount", 0] },
        // Trending = copies + stars (recency breaks ties via the $sort below).
        trendingScore: { $add: [{ $ifNull: ["$copyCount", 0] }, { $size: { $ifNull: ["$starredBy", []] } }] },
      },
    },
    { $sort: sortField },
  ];
  // Paginate after sorting (before the user lookup, so we only join one page).
  if (opts.skip && opts.skip > 0) pipeline.push({ $skip: Math.floor(opts.skip) });
  if (opts.limit && opts.limit > 0) pipeline.push({ $limit: Math.floor(opts.limit) });
  pipeline.push(
    { $lookup: { from: "users", localField: "ownerEmail", foreignField: "email", as: "u" } },
    { $unwind: { path: "$u", preserveNullAndEmptyArrays: true } },
  );

  const rows = await db.collection("prompts").aggregate(pipeline).toArray();

  return rows.map((r: any) => ({
    id: r._id.toString(),
    name: r.name,
    description: r.description,
    category: r.category,
    image: r.image ?? null,
    stars: r.stars || 0,
    isPrivate: r.isPrivate || false,
    testedModels: r.testedModels || [],
    copyCount: r.copyCount || 0,
    priceCents: r.priceCents || 0,
    tags: r.tags || [],
    createdAt: r.createdAt,
    tokens: estimateTokens(promptToText({ body: r.body, files: r.files })),
    author: { email: r.ownerEmail, name: r.u?.name || r.ownerEmail.split("@")[0], image: r.u?.image ?? null },
  }));
}

export async function listCategories(db: Db): Promise<string[]> {
  return ((await db.collection("prompts").distinct("category")) as string[]).sort();
}

/** Public prompt counts per category, descending by count. */
export async function topCategories(db: Db): Promise<{ category: string; count: number }[]> {
  const rows = await db
    .collection("prompts")
    .aggregate([
      { $match: { isPrivate: { $ne: true } } },
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1, _id: 1 } },
    ])
    .toArray();
  return rows.map((r: any) => ({ category: r._id as string, count: r.count as number }));
}

/** Most-used tags across public prompts, descending by count. */
export async function topTags(db: Db, limit = 30): Promise<{ tag: string; count: number }[]> {
  const rows = await db
    .collection("prompts")
    .aggregate([
      { $match: { isPrivate: { $ne: true }, tags: { $type: "array", $ne: [] } } },
      { $unwind: "$tags" },
      { $group: { _id: "$tags", count: { $sum: 1 } } },
      { $sort: { count: -1, _id: 1 } },
      { $limit: limit },
    ])
    .toArray();
  return rows.map((r: any) => ({ tag: r._id as string, count: r.count as number }));
}

// Tag autocomplete: public tags containing the query substring (case-insensitive),
// ranked by usage then alphabetically. Empty query → []. Query is regex-escaped.
export async function searchTags(db: Db, query: string, limit = 10): Promise<{ tag: string; count: number }[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const rows = await db
    .collection("prompts")
    .aggregate([
      { $match: { isPrivate: { $ne: true }, tags: { $type: "array", $ne: [] } } },
      { $unwind: "$tags" },
      { $match: { tags: { $regex: escaped } } },
      { $group: { _id: "$tags", count: { $sum: 1 } } },
      { $sort: { count: -1, _id: 1 } },
      { $limit: limit },
    ])
    .toArray();
  return rows.map((r: any) => ({ tag: r._id as string, count: r.count as number }));
}

// Tags trending by recent copy activity. Each copy of a public prompt in the
// window adds 1 to every tag on that prompt; ranked desc. `now` is injectable
// for deterministic tests.
export async function trendingTags(
  db: Db,
  opts: { days?: number; limit?: number; now?: Date } = {},
): Promise<{ tag: string; score: number }[]> {
  const days = opts.days ?? 7;
  const limit = opts.limit ?? 20;
  const now = opts.now ?? new Date();
  const since = new Date(now.getTime() - days * 86400000);

  // Copies per prompt within the window.
  const events = await db
    .collection("copyEvents")
    .aggregate([{ $match: { createdAt: { $gte: since } } }, { $group: { _id: "$promptId", copies: { $sum: 1 } } }])
    .toArray();
  if (!events.length) return [];

  const copiesById = new Map<string, number>();
  for (const e of events as any[]) {
    if (ObjectId.isValid(e._id)) copiesById.set(e._id as string, e.copies as number);
  }
  if (!copiesById.size) return [];

  const objIds = [...copiesById.keys()].map((id) => new ObjectId(id));
  const prompts = await db
    .collection("prompts")
    .find({ _id: { $in: objIds }, isPrivate: { $ne: true }, tags: { $type: "array", $ne: [] } }, { projection: { tags: 1 } })
    .toArray();

  const scores = new Map<string, number>();
  for (const p of prompts as any[]) {
    const copies = copiesById.get(p._id.toString()) || 0;
    for (const tag of p.tags as string[]) scores.set(tag, (scores.get(tag) || 0) + copies);
  }

  return [...scores.entries()]
    .map(([tag, score]) => ({ tag, score }))
    .sort((a, b) => b.score - a.score || a.tag.localeCompare(b.tag))
    .slice(0, limit);
}

export async function uniqueSlug(db: Db, ownerEmail: string, name: string): Promise<string> {
  const base = slugify(name);
  let slug = base;
  for (let n = 2; await db.collection("prompts").findOne({ ownerEmail, slug }); n++) slug = `${base}-${n}`;
  return slug;
}

export async function createPrompt(db: Db, ownerEmail: string, data: NewPrompt): Promise<Omit<Prompt, "author"> & { slug: string }> {
  const files = data.files?.length
    ? data.files.map((f) => ({ path: f.path, content: f.content, language: f.language || languageFromPath(f.path) }))
    : undefined;
  const body = data.body ?? (files ? files.map((f) => f.content).join("\n\n") : "");
  const slug = await uniqueSlug(db, ownerEmail, data.name);
  // Only record lineage when forkedFrom points at an existing prompt.
  let forkedFrom: string | null = null;
  let forkSource: { ownerEmail: string; name: string } | null = null;
  if (data.forkedFrom && ObjectId.isValid(data.forkedFrom)) {
    const src = await db.collection("prompts").findOne({ _id: new ObjectId(data.forkedFrom) }, { projection: { ownerEmail: 1, name: 1 } });
    if (src) {
      forkedFrom = data.forkedFrom;
      forkSource = { ownerEmail: src.ownerEmail, name: src.name };
    }
  }
  const doc: Record<string, unknown> = {
    ownerEmail,
    name: data.name,
    description: data.description,
    category: data.category,
    body,
    slug,
    image: data.image || null,
    isPrivate: !!data.isPrivate,
    testedModels: data.testedModels || [],
    priceCents: data.priceCents || 0,
    tags: normalizeTags(data.tags),
    forkedFrom,
    starredBy: [],
    sharedWith: [],
    createdAt: new Date(),
  };
  if (files) doc.files = files;
  const { insertedId } = await db.collection("prompts").insertOne(doc);
  // Notify the source owner when their prompt is forked (best-effort, no self-notify).
  if (forkSource) {
    try {
      const { addNotification, actorName } = await import("./notifications");
      await addNotification(db, {
        recipientEmail: forkSource.ownerEmail,
        type: "fork",
        actorEmail: ownerEmail,
        actorName: await actorName(db, ownerEmail),
        promptId: insertedId.toString(),
        promptName: forkSource.name,
      });
    } catch {
      /* notifications are best-effort */
    }
  }
  return {
    id: insertedId.toString(),
    name: data.name,
    description: data.description,
    category: data.category,
    slug,
    image: (doc.image as string | null),
    stars: 0,
    isPrivate: doc.isPrivate as boolean,
    testedModels: doc.testedModels as TestedModel[],
    copyCount: 0,
    priceCents: doc.priceCents as number,
    tags: doc.tags as string[],
    createdAt: doc.createdAt as Date,
  };
}

// Owner-scoped update. Returns true only when the prompt exists AND belongs to ownerEmail.
export async function updatePrompt(
  db: Db,
  id: string,
  ownerEmail: string,
  data: Partial<NewPrompt>,
  opts?: { message?: string },
): Promise<boolean> {
  if (!ObjectId.isValid(id)) return false;
  const set: Record<string, unknown> = {};
  if (data.name !== undefined) set.name = data.name;
  if (data.description !== undefined) set.description = data.description;
  if (data.category !== undefined) set.category = data.category;
  if (data.image !== undefined) set.image = data.image || null;
  if (data.isPrivate !== undefined) set.isPrivate = !!data.isPrivate;
  if (data.testedModels !== undefined) set.testedModels = data.testedModels;
  if (data.priceCents !== undefined) set.priceCents = data.priceCents || 0;
  if (data.tags !== undefined) set.tags = normalizeTags(data.tags);
  if (data.files !== undefined) {
    const files = data.files.map((f) => ({ path: f.path, content: f.content, language: f.language || languageFromPath(f.path) }));
    set.files = files;
    set.body = files.map((f) => f.content).join("\n\n");
  } else if (data.body !== undefined) {
    set.body = data.body;
  }
  if (Object.keys(set).length === 0) return false;

  // Snapshot the prior content before applying a content edit (owner-scoped).
  const current = await db.collection("prompts").findOne({ _id: new ObjectId(id), ownerEmail });
  if (!current) return false;
  const contentChanged = set.name !== undefined || set.body !== undefined || set.files !== undefined;
  if (contentChanged) {
    const version = (await db.collection("promptVersions").countDocuments({ promptId: id })) + 1;
    // The "commit message" describes the edit being applied now; the snapshot
    // captures the prior content that this edit replaces.
    const message = (opts?.message ?? "").trim().slice(0, 200);
    await db.collection("promptVersions").insertOne({
      promptId: id,
      version,
      name: current.name,
      body: current.body ?? "",
      files: current.files ?? null,
      message,
      createdAt: new Date(),
    });
  }

  set.updatedAt = new Date();
  const res = await db.collection("prompts").updateOne({ _id: new ObjectId(id), ownerEmail }, { $set: set });
  return res.matchedCount > 0;
}

// Owner-scoped delete. Returns true only when a prompt owned by ownerEmail was removed.
export async function deletePrompt(db: Db, id: string, ownerEmail: string): Promise<boolean> {
  if (!ObjectId.isValid(id)) return false;
  const res = await db.collection("prompts").deleteOne({ _id: new ObjectId(id), ownerEmail });
  return res.deletedCount > 0;
}

export async function getPrompt(db: Db, id: string): Promise<PromptWithBody | null> {
  if (!ObjectId.isValid(id)) return null;
  const row = await db.collection("prompts").findOne({ _id: new ObjectId(id) });
  return row
    ? {
        id: row._id.toString(),
        name: row.name,
        description: row.description,
        category: row.category,
        body: row.body,
        ownerEmail: row.ownerEmail,
        image: row.image ?? null,
        stars: row.starredBy?.length || 0,
        isPrivate: row.isPrivate || false,
        sharedWith: row.sharedWith || [],
        starredBy: row.starredBy || [],
        testedModels: row.testedModels || [],
        createdAt: row.createdAt,
      }
    : null;
}

export async function getPromptDetail(db: Db, id: string, viewerEmail?: string | null): Promise<PromptDetail | null> {
  if (!ObjectId.isValid(id)) return null;
  const row = await db.collection("prompts").findOne({ _id: new ObjectId(id) });
  if (!row) return null;
  const u = await db.collection("users").findOne({ email: row.ownerEmail });
  const files = normalizeFiles(row as { files?: PromptFile[]; body?: string });
  // Resolve lineage: the source this was forked from (if it still exists) and how many forks it has.
  let forkedFrom: { id: string; name: string } | null = null;
  if (row.forkedFrom && ObjectId.isValid(row.forkedFrom)) {
    const src = await db.collection("prompts").findOne({ _id: new ObjectId(row.forkedFrom) }, { projection: { name: 1 } });
    if (src) forkedFrom = { id: row.forkedFrom, name: src.name };
  }
  const forkCount = await db.collection("prompts").countDocuments({ forkedFrom: row._id.toString() });
  return {
    id: row._id.toString(),
    name: row.name,
    description: row.description,
    category: row.category,
    body: row.body ?? files.map((f) => f.content).join("\n\n"),
    files,
    author: { email: row.ownerEmail, name: u?.name || row.ownerEmail.split("@")[0], image: u?.image ?? null },
    image: row.image ?? null,
    stars: row.starredBy?.length || 0,
    isPrivate: row.isPrivate || false,
    testedModels: row.testedModels || [],
    copyCount: row.copyCount || 0,
    viewCount: row.viewCount || 0,
    priceCents: row.priceCents || 0,
    tags: row.tags || [],
    forkedFrom,
    forkCount,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt ?? null,
    isStarred: !!viewerEmail && Array.isArray(row.starredBy) && row.starredBy.includes(viewerEmail),
    // canonical handle/slug included only when both are backfilled (kept off the strict type)
    ...(u?.handle && row.slug ? { handle: u.handle as string, slug: row.slug as string } : {}),
  };
}

/**
 * Atomically bump a prompt's copy/usage counter and return the new total.
 * Returns null for a malformed or missing id.
 */
export async function incrementCopyCount(db: Db, id: string): Promise<number | null> {
  if (!ObjectId.isValid(id)) return null;
  const res = await db.collection("prompts").findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $inc: { copyCount: 1 } },
    { returnDocument: "after" }
  );
  const doc = (res as { value?: { copyCount?: number } } | null)?.value ?? (res as { copyCount?: number } | null);
  if (!doc || typeof doc.copyCount !== "number") return null;
  // Log a copy event for over-time analytics (best-effort).
  try {
    await db.collection("copyEvents").insertOne({ promptId: id, createdAt: new Date() });
  } catch {
    /* analytics is best-effort */
  }
  return doc.copyCount;
}

/**
 * Bump a prompt's view counter and return the new total. A soft engagement
 * signal — public and not auth-gated. Returns null for a malformed/missing id.
 */
export async function incrementViewCount(db: Db, id: string): Promise<number | null> {
  if (!ObjectId.isValid(id)) return null;
  const res = await db.collection("prompts").findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $inc: { viewCount: 1 } },
    { returnDocument: "after" },
  );
  const doc = (res as { value?: { viewCount?: number } } | null)?.value ?? (res as { viewCount?: number } | null);
  if (!doc || typeof doc.viewCount !== "number") return null;
  return doc.viewCount;
}

/**
 * Public prompts in the same category as `id`, excluding itself, ordered by
 * most-copied. Used for the "related prompts" section. Returns [] for a
 * malformed/missing id.
 */
export async function getRelatedPrompts(db: Db, id: string, limit = 4): Promise<Prompt[]> {
  if (!ObjectId.isValid(id)) return [];
  const current = await db.collection("prompts").findOne({ _id: new ObjectId(id) });
  if (!current) return [];

  const rows = await db
    .collection("prompts")
    .aggregate([
      { $match: { category: current.category, isPrivate: { $ne: true }, _id: { $ne: new ObjectId(id) } } },
      { $addFields: { stars: { $size: { $ifNull: ["$starredBy", []] } }, copyCount: { $ifNull: ["$copyCount", 0] } } },
      { $sort: { copyCount: -1, createdAt: -1, _id: -1 } },
      { $limit: limit },
      { $lookup: { from: "users", localField: "ownerEmail", foreignField: "email", as: "u" } },
      { $unwind: { path: "$u", preserveNullAndEmptyArrays: true } },
    ])
    .toArray();

  return rows.map((r: any) => ({
    id: r._id.toString(),
    name: r.name,
    description: r.description,
    category: r.category,
    image: r.image ?? null,
    stars: r.stars || 0,
    isPrivate: r.isPrivate || false,
    testedModels: r.testedModels || [],
    copyCount: r.copyCount || 0,
    priceCents: r.priceCents || 0,
    tags: r.tags || [],
    createdAt: r.createdAt,
    author: { email: r.ownerEmail, name: r.u?.name || r.ownerEmail.split("@")[0], image: r.u?.image ?? null },
  }));
}

/**
 * Other public prompts by the same author as `id`, excluding itself, ordered by
 * most-copied. Returns [] for a malformed/missing id or when the author has no
 * other public prompts.
 */
export async function listMoreByAuthor(db: Db, id: string, limit = 4): Promise<Prompt[]> {
  if (!ObjectId.isValid(id)) return [];
  const current = await db.collection("prompts").findOne({ _id: new ObjectId(id) }, { projection: { ownerEmail: 1 } });
  if (!current) return [];

  const rows = await db
    .collection("prompts")
    .aggregate([
      { $match: { ownerEmail: current.ownerEmail, isPrivate: { $ne: true }, _id: { $ne: new ObjectId(id) } } },
      { $addFields: { stars: { $size: { $ifNull: ["$starredBy", []] } }, copyCount: { $ifNull: ["$copyCount", 0] } } },
      { $sort: { copyCount: -1, createdAt: -1, _id: -1 } },
      { $limit: limit },
      { $lookup: { from: "users", localField: "ownerEmail", foreignField: "email", as: "u" } },
      { $unwind: { path: "$u", preserveNullAndEmptyArrays: true } },
    ])
    .toArray();

  return rows.map((r: any) => ({
    id: r._id.toString(),
    name: r.name,
    description: r.description,
    category: r.category,
    image: r.image ?? null,
    stars: r.stars || 0,
    isPrivate: r.isPrivate || false,
    testedModels: r.testedModels || [],
    copyCount: r.copyCount || 0,
    priceCents: r.priceCents || 0,
    tags: r.tags || [],
    createdAt: r.createdAt,
    author: { email: r.ownerEmail, name: r.u?.name || r.ownerEmail.split("@")[0], image: r.u?.image ?? null },
  }));
}

/**
 * Public prompts sharing at least one tag with `id`, excluding itself, ranked by
 * number of overlapping tags (then most-copied). Returns [] if the prompt has no
 * tags, no matches, or a malformed/missing id.
 */
export async function getRelatedByTags(db: Db, id: string, limit = 4): Promise<Prompt[]> {
  if (!ObjectId.isValid(id)) return [];
  const current = await db.collection("prompts").findOne({ _id: new ObjectId(id) });
  if (!current) return [];
  const tags: string[] = current.tags || [];
  if (!tags.length) return [];

  const rows = await db
    .collection("prompts")
    .aggregate([
      { $match: { isPrivate: { $ne: true }, _id: { $ne: new ObjectId(id) }, tags: { $in: tags } } },
      {
        $addFields: {
          stars: { $size: { $ifNull: ["$starredBy", []] } },
          copyCount: { $ifNull: ["$copyCount", 0] },
          overlap: { $size: { $setIntersection: [{ $ifNull: ["$tags", []] }, tags] } },
        },
      },
      { $sort: { overlap: -1, copyCount: -1, createdAt: -1, _id: -1 } },
      { $limit: limit },
      { $lookup: { from: "users", localField: "ownerEmail", foreignField: "email", as: "u" } },
      { $unwind: { path: "$u", preserveNullAndEmptyArrays: true } },
    ])
    .toArray();

  return rows.map((r: any) => ({
    id: r._id.toString(),
    name: r.name,
    description: r.description,
    category: r.category,
    image: r.image ?? null,
    stars: r.stars || 0,
    isPrivate: r.isPrivate || false,
    testedModels: r.testedModels || [],
    copyCount: r.copyCount || 0,
    priceCents: r.priceCents || 0,
    tags: r.tags || [],
    createdAt: r.createdAt,
    author: { email: r.ownerEmail, name: r.u?.name || r.ownerEmail.split("@")[0], image: r.u?.image ?? null },
  }));
}

export async function getPromptDetailByHandleAndSlug(db: Db, handle: string, slug: string, viewerEmail?: string | null): Promise<NamespacedPromptDetail | null> {
  const user = await db.collection("users").findOne({ handle });
  if (!user) return null;
  const row = await db.collection("prompts").findOne({ ownerEmail: user.email, slug });
  if (!row) return null;
  const files = normalizeFiles(row as { files?: PromptFile[]; body?: string });
  let forkedFrom: { id: string; name: string } | null = null;
  if (row.forkedFrom && ObjectId.isValid(row.forkedFrom)) {
    const src = await db.collection("prompts").findOne({ _id: new ObjectId(row.forkedFrom) }, { projection: { name: 1 } });
    if (src) forkedFrom = { id: row.forkedFrom, name: src.name };
  }
  const forkCount = await db.collection("prompts").countDocuments({ forkedFrom: row._id.toString() });
  return {
    id: row._id.toString(),
    name: row.name,
    description: row.description,
    category: row.category,
    body: row.body ?? files.map((f) => f.content).join("\n\n"),
    files,
    author: { email: row.ownerEmail, name: user.name || row.ownerEmail.split("@")[0], image: user.image ?? null },
    image: row.image ?? null,
    stars: row.starredBy?.length || 0,
    isPrivate: row.isPrivate || false,
    testedModels: row.testedModels || [],
    copyCount: row.copyCount || 0,
    viewCount: row.viewCount || 0,
    priceCents: row.priceCents || 0,
    tags: row.tags || [],
    forkedFrom,
    forkCount,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt ?? null,
    isStarred: !!viewerEmail && Array.isArray(row.starredBy) && row.starredBy.includes(viewerEmail),
    handle,
    slug,
  };
}

export async function toggleStar(db: Db, promptId: string, userEmail: string): Promise<boolean> {
  if (!ObjectId.isValid(promptId)) return false;
  const prompt = await db.collection("prompts").findOne({ _id: new ObjectId(promptId) });
  if (!prompt) return false;

  const starredBy = (prompt.starredBy || []) as string[];
  const isStarred = starredBy.includes(userEmail);

  if (isStarred) {
    // Remove star
    await db.collection("prompts").updateOne(
      { _id: new ObjectId(promptId) },
      { $pull: { starredBy: userEmail } as any }
    );
    // Remove from user's favorites
    await removeFromFavorites(db, userEmail, promptId);
  } else {
    // Add star
    await db.collection("prompts").updateOne(
      { _id: new ObjectId(promptId) },
      { $addToSet: { starredBy: userEmail } as any }
    );
    // Add to user's favorites
    await addToFavorites(db, userEmail, promptId);
  }

  return !isStarred;
}

export async function addToFavorites(db: Db, userEmail: string, promptId: string): Promise<void> {
  await db.collection("users").updateOne(
    { email: userEmail },
    { $addToSet: { favorites: promptId } } as any
  );
}

export async function removeFromFavorites(db: Db, userEmail: string, promptId: string): Promise<void> {
  await db.collection("users").updateOne(
    { email: userEmail },
    { $pull: { favorites: promptId } } as any
  );
}

export async function getFavorites(db: Db, userEmail: string): Promise<string[]> {
  const user = await db.collection("users").findOne({ email: userEmail });
  return user?.favorites || [];
}

export async function sharePrompt(db: Db, promptId: string, ownerEmail: string, shareWithEmail: string): Promise<boolean> {
  if (!ObjectId.isValid(promptId)) return false;
  const prompt = await db.collection("prompts").findOne({ _id: new ObjectId(promptId) });
  if (!prompt || prompt.ownerEmail !== ownerEmail) return false;

  await db.collection("prompts").updateOne(
    { _id: new ObjectId(promptId) },
    { $addToSet: { sharedWith: shareWithEmail } } as any
  );
  return true;
}
