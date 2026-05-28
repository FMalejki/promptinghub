import { Db, ObjectId } from "mongodb";

export type Prompt = { id: string; name: string; description: string; category: string };
export type PromptWithBody = Prompt & { body: string };
export type ListOpts = { q?: string; category?: string };

export async function listPrompts(db: Db, ownerEmail: string, opts: ListOpts = {}): Promise<Prompt[]> {
  const filter: Record<string, unknown> = { ownerEmail };
  if (opts.category) filter.category = opts.category;
  if (opts.q) {
    const rx = { $regex: opts.q, $options: "i" };
    filter.$or = [{ name: rx }, { description: rx }];
  }
  const rows = await db.collection("prompts").find(filter).project({ name: 1, description: 1, category: 1 }).toArray();
  return rows.map((r) => ({ id: r._id.toString(), name: r.name, description: r.description, category: r.category }));
}

export async function listCategories(db: Db, ownerEmail: string): Promise<string[]> {
  const cats = (await db.collection("prompts").distinct("category", { ownerEmail })) as string[];
  return cats.sort();
}

export async function getPrompt(db: Db, id: string, ownerEmail: string): Promise<PromptWithBody | null> {
  if (!ObjectId.isValid(id)) return null;
  const row = await db.collection("prompts").findOne({ _id: new ObjectId(id), ownerEmail });
  return row
    ? { id: row._id.toString(), name: row.name, description: row.description, category: row.category, body: row.body }
    : null;
}
