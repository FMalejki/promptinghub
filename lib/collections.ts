import { Db, ObjectId } from "mongodb";
import { slugify } from "./slug";
import { getPromptDetail, type Prompt } from "./prompts";

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
      createdAt: p.createdAt,
    }));
  return { ...c, prompts };
}

export async function listCollectionsByOwner(db: Db, ownerEmail: string): Promise<Collection[]> {
  const rows = await db.collection("collections").find({ ownerEmail }).sort({ createdAt: -1 }).toArray();
  return rows.map(toCollection);
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
