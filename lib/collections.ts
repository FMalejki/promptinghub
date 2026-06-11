import { Db, ObjectId } from "mongodb";
import { slugify } from "./slug";
import { getPromptDetail, type Prompt } from "./prompts";
import { collectionCover } from "./collectionCover";

export type Collection = {
  id: string;
  ownerEmail: string;
  name: string;
  slug: string;
  description: string;
  promptIds: string[];
  createdAt: Date;
};

export type NewCollection = { name: string; description?: string };

export type CollectionDetail = Collection & { prompts: Prompt[] };

async function uniqueCollectionSlug(db: Db, ownerEmail: string, name: string): Promise<string> {
  const base = slugify(name) || "collection";
  let slug = base;
  for (let n = 2; await db.collection("collections").findOne({ ownerEmail, slug }); n++) slug = `${base}-${n}`;
  return slug;
}

function toCollection(row: any): Collection {
  return {
    id: row._id.toString(),
    ownerEmail: row.ownerEmail,
    name: row.name,
    slug: row.slug,
    description: row.description || "",
    promptIds: (row.promptIds || []).map((p: any) => p.toString()),
    createdAt: row.createdAt,
  };
}

export async function createCollection(db: Db, ownerEmail: string, data: NewCollection): Promise<{ id: string; slug: string }> {
  const slug = await uniqueCollectionSlug(db, ownerEmail, data.name);
  const doc = {
    ownerEmail,
    name: data.name,
    slug,
    description: data.description || "",
    promptIds: [] as string[],
    createdAt: new Date(),
  };
  const { insertedId } = await db.collection("collections").insertOne(doc);
  return { id: insertedId.toString(), slug };
}

export async function getCollection(db: Db, id: string): Promise<Collection | null> {
  if (!ObjectId.isValid(id)) return null;
  const row = await db.collection("collections").findOne({ _id: new ObjectId(id) });
  return row ? toCollection(row) : null;
}

export async function getCollectionDetail(db: Db, id: string): Promise<CollectionDetail | null> {
  const c = await getCollection(db, id);
  if (!c) return null;
  const prompts = (await Promise.all(c.promptIds.map((pid) => getPromptDetail(db, pid))))
    .filter((p): p is NonNullable<typeof p> => p !== null)
    .map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      category: p.category,
      author: p.author,
      image: p.image,
      stars: p.stars,
      isPrivate: p.isPrivate,
      testedModels: p.testedModels,
      copyCount: p.copyCount,
      priceCents: p.priceCents,
      tags: p.tags,
      createdAt: p.createdAt,
    }));
  return { ...c, prompts };
}

export type CollectionExport = {
  name: string;
  description: string;
  prompts: { name: string; description: string; files: { path: string; content: string }[] }[];
};

// A portable JSON bundle of a collection: each prompt with its files, in saved order.
export async function getCollectionExport(db: Db, id: string): Promise<CollectionExport | null> {
  const c = await getCollection(db, id);
  if (!c) return null;
  const details = await Promise.all(c.promptIds.map((pid) => getPromptDetail(db, pid)));
  const prompts = details
    .filter((p): p is NonNullable<typeof p> => p !== null)
    .map((p) => ({
      name: p.name,
      description: p.description,
      files: p.files.map((f) => ({ path: f.path, content: f.content })),
    }));
  return { name: c.name, description: c.description, prompts };
}

export async function listCollectionsByOwner(db: Db, ownerEmail: string): Promise<Collection[]> {
  const rows = await db.collection("collections").find({ ownerEmail }).sort({ createdAt: -1 }).toArray();
  return rows.map(toCollection);
}

export type PublicCollection = {
  id: string;
  name: string;
  slug: string;
  description: string;
  promptCount: number;
  cover: string | null;
  owner: { name: string; handle: string | null };
  createdAt: Date;
};

// Public index of collections that actually have prompts, newest first.
export async function listPublicCollections(db: Db, limit = 50): Promise<PublicCollection[]> {
  const rows = await db
    .collection("collections")
    .find({ promptIds: { $exists: true, $ne: [] } })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();

  const emails = [...new Set(rows.map((r) => r.ownerEmail))];
  const users = await db.collection("users").find({ email: { $in: emails } }).toArray();
  const byEmail = new Map(users.map((u) => [u.email, u]));

  // Derive a cover from the prompts' images in one batched lookup.
  const promptIds = [
    ...new Set(rows.flatMap((r) => (r.promptIds || []).map((p: any) => p.toString()))),
  ].filter((id) => ObjectId.isValid(id));
  const promptDocs = promptIds.length
    ? await db
        .collection("prompts")
        .find({ _id: { $in: promptIds.map((id) => new ObjectId(id)) }, isPrivate: { $ne: true } })
        .project({ image: 1 })
        .toArray()
    : [];
  const imageById = new Map(promptDocs.map((p) => [p._id.toString(), (p as any).image ?? null]));

  return rows.map((r) => {
    const u = byEmail.get(r.ownerEmail);
    const ids = (r.promptIds || []).map((p: any) => p.toString());
    return {
      id: r._id.toString(),
      name: r.name,
      slug: r.slug,
      description: r.description || "",
      promptCount: ids.length,
      cover: collectionCover(ids.map((id: string) => ({ image: imageById.get(id) }))),
      owner: { name: u?.name || r.ownerEmail.split("@")[0], handle: u?.handle ?? null },
      createdAt: r.createdAt,
    };
  });
}

// Owner-scoped; stores prompt ids as strings, deduped, append-ordered.
export async function addPromptToCollection(db: Db, id: string, ownerEmail: string, promptId: string): Promise<boolean> {
  if (!ObjectId.isValid(id) || !ObjectId.isValid(promptId)) return false;
  const res = await db
    .collection("collections")
    .updateOne({ _id: new ObjectId(id), ownerEmail }, { $addToSet: { promptIds: promptId } });
  return res.matchedCount > 0;
}

export async function removePromptFromCollection(db: Db, id: string, ownerEmail: string, promptId: string): Promise<boolean> {
  if (!ObjectId.isValid(id)) return false;
  const res = await db
    .collection("collections")
    .updateOne({ _id: new ObjectId(id), ownerEmail }, { $pull: { promptIds: promptId } as any });
  return res.matchedCount > 0;
}

export async function deleteCollection(db: Db, id: string, ownerEmail: string): Promise<boolean> {
  if (!ObjectId.isValid(id)) return false;
  const res = await db.collection("collections").deleteOne({ _id: new ObjectId(id), ownerEmail });
  return res.deletedCount > 0;
}
