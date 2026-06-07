import { Db, ObjectId } from "mongodb";
import { slugify } from "./slug";

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
  createdAt: Date;
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
  createdAt: Date;
};

export type NamespacedPromptDetail = PromptDetail & { handle: string; slug: string };

export type ListOpts = {
  q?: string;
  category?: string;
  model?: string;
  ownerEmail?: string;
  sort?: "recent" | "popular" | "copied";
  includePrivate?: boolean;
  userEmail?: string;
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

  // Privacy filter
  if (!opts.includePrivate) {
    match.isPrivate = { $ne: true };
  } else if (opts.userEmail) {
    match.$or = [
      { isPrivate: { $ne: true } },
      { ownerEmail: opts.userEmail },
      { sharedWith: opts.userEmail }
    ];
  }

  if (opts.ownerEmail) match.ownerEmail = opts.ownerEmail;
  if (opts.category) match.category = opts.category;
  if (opts.model) match["testedModels.modelId"] = opts.model;
  if (opts.q) {
    const rx = { $regex: opts.q, $options: "i" };
    // Combine with $and so a search $or doesn't clobber the privacy $or above.
    const searchOr = [{ name: rx }, { description: rx }];
    if (match.$or) {
      match.$and = [{ $or: match.$or }, { $or: searchOr }];
      delete match.$or;
    } else {
      match.$or = searchOr;
    }
  }

  const sortField =
    opts.sort === "popular"
      ? { stars: -1, createdAt: -1 }
      : opts.sort === "copied"
      ? { copyCount: -1, createdAt: -1 }
      : { createdAt: -1, _id: -1 };

  const rows = await db
    .collection("prompts")
    .aggregate([
      { $match: match },
      { $addFields: { stars: { $size: { $ifNull: ["$starredBy", []] } }, copyCount: { $ifNull: ["$copyCount", 0] } } },
      { $sort: sortField },
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
    createdAt: r.createdAt,
    author: { email: r.ownerEmail, name: r.u?.name || r.ownerEmail.split("@")[0], image: r.u?.image ?? null },
  }));
}

export async function listCategories(db: Db): Promise<string[]> {
  return ((await db.collection("prompts").distinct("category")) as string[]).sort();
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
    starredBy: [],
    sharedWith: [],
    createdAt: new Date(),
  };
  if (files) doc.files = files;
  const { insertedId } = await db.collection("prompts").insertOne(doc);
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
    createdAt: doc.createdAt as Date,
  };
}

// Owner-scoped update. Returns true only when the prompt exists AND belongs to ownerEmail.
export async function updatePrompt(db: Db, id: string, ownerEmail: string, data: Partial<NewPrompt>): Promise<boolean> {
  if (!ObjectId.isValid(id)) return false;
  const set: Record<string, unknown> = {};
  if (data.name !== undefined) set.name = data.name;
  if (data.description !== undefined) set.description = data.description;
  if (data.category !== undefined) set.category = data.category;
  if (data.image !== undefined) set.image = data.image || null;
  if (data.isPrivate !== undefined) set.isPrivate = !!data.isPrivate;
  if (data.testedModels !== undefined) set.testedModels = data.testedModels;
  if (data.files !== undefined) {
    const files = data.files.map((f) => ({ path: f.path, content: f.content, language: f.language || languageFromPath(f.path) }));
    set.files = files;
    set.body = files.map((f) => f.content).join("\n\n");
  } else if (data.body !== undefined) {
    set.body = data.body;
  }
  if (Object.keys(set).length === 0) return false;
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

export async function getPromptDetail(db: Db, id: string): Promise<PromptDetail | null> {
  if (!ObjectId.isValid(id)) return null;
  const row = await db.collection("prompts").findOne({ _id: new ObjectId(id) });
  if (!row) return null;
  const u = await db.collection("users").findOne({ email: row.ownerEmail });
  const files = normalizeFiles(row as { files?: PromptFile[]; body?: string });
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
    createdAt: row.createdAt,
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
  return doc.copyCount;
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
    createdAt: r.createdAt,
    author: { email: r.ownerEmail, name: r.u?.name || r.ownerEmail.split("@")[0], image: r.u?.image ?? null },
  }));
}

export async function getPromptDetailByHandleAndSlug(db: Db, handle: string, slug: string): Promise<NamespacedPromptDetail | null> {
  const user = await db.collection("users").findOne({ handle });
  if (!user) return null;
  const row = await db.collection("prompts").findOne({ ownerEmail: user.email, slug });
  if (!row) return null;
  const files = normalizeFiles(row as { files?: PromptFile[]; body?: string });
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
    createdAt: row.createdAt,
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
