import { Db, ObjectId } from "mongodb";

export type Prompt = { id: string; name: string; description: string };
export type PromptWithBody = Prompt & { body: string };

export async function listPrompts(db: Db, query?: string): Promise<Prompt[]> {
  const filter = query
    ? { $or: [{ name: { $regex: query, $options: "i" } }, { description: { $regex: query, $options: "i" } }] }
    : {};
  const rows = await db.collection("prompts").find(filter).project({ name: 1, description: 1 }).toArray();
  return rows.map((r) => ({ id: r._id.toString(), name: r.name, description: r.description }));
}

export async function getPrompt(db: Db, id: string): Promise<PromptWithBody | null> {
  if (!ObjectId.isValid(id)) return null;
  const row = await db.collection("prompts").findOne({ _id: new ObjectId(id) });
  return row ? { id: row._id.toString(), name: row.name, description: row.description, body: row.body } : null;
}
