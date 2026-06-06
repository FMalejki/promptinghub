import { Db, ObjectId } from "mongodb";

export type Author = { email: string; name: string; image: string | null };
export type Prompt = { id: string; name: string; description: string; category: string; author: Author };
export type PromptWithBody = { id: string; name: string; description: string; category: string; body: string; ownerEmail: string };
export type PromptDetail = { id: string; name: string; description: string; category: string; body: string; author: Author };
export type ListOpts = { q?: string; category?: string };
export type NewPrompt = { name: string; description: string; category: string; body: string };

export async function listPrompts(db: Db, opts: ListOpts = {}): Promise<Prompt[]> {
  const match: Record<string, unknown> = {};
  if (opts.category) match.category = opts.category;
  if (opts.q) {
    const rx = { $regex: opts.q, $options: "i" };
    match.$or = [{ name: rx }, { description: rx }];
  }
  const rows = await db
    .collection("prompts")
    .aggregate([
      { $match: match },
      { $sort: { createdAt: -1, _id: -1 } },
      { $lookup: { from: "users", localField: "ownerEmail", foreignField: "email", as: "u" } },
      { $unwind: { path: "$u", preserveNullAndEmptyArrays: true } },
    ])
    .toArray();
  return rows.map((r) => ({
    id: r._id.toString(),
    name: r.name,
    description: r.description,
    category: r.category,
    author: { email: r.ownerEmail, name: r.u?.name || r.ownerEmail.split("@")[0], image: r.u?.image ?? null },
  }));
}

export async function listCategories(db: Db): Promise<string[]> {
  return ((await db.collection("prompts").distinct("category")) as string[]).sort();
}

export async function createPrompt(db: Db, ownerEmail: string, data: NewPrompt): Promise<Omit<Prompt, "author">> {
  const doc = { ownerEmail, name: data.name, description: data.description, category: data.category, body: data.body, createdAt: new Date() };
  const { insertedId } = await db.collection("prompts").insertOne(doc);
  return { id: insertedId.toString(), name: doc.name, description: doc.description, category: doc.category };
}

export async function getPrompt(db: Db, id: string): Promise<PromptWithBody | null> {
  if (!ObjectId.isValid(id)) return null;
  const row = await db.collection("prompts").findOne({ _id: new ObjectId(id) });
  return row
    ? { id: row._id.toString(), name: row.name, description: row.description, category: row.category, body: row.body, ownerEmail: row.ownerEmail }
    : null;
}

export async function getPromptDetail(db: Db, id: string): Promise<PromptDetail | null> {
  const p = await getPrompt(db, id);
  if (!p) return null;
  const u = await db.collection("users").findOne({ email: p.ownerEmail });
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    category: p.category,
    body: p.body,
    author: { email: p.ownerEmail, name: u?.name || p.ownerEmail.split("@")[0], image: u?.image ?? null },
  };
}
