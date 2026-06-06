import { Db, ObjectId } from "mongodb";

export type Author = { email: string; name: string; image: string | null };
export type Prompt = { id: string; name: string; description: string; category: string; author: Author };
export type PromptFile = { path: string; content: string; language: string };
export type PromptWithBody = { id: string; name: string; description: string; category: string; body: string; ownerEmail: string };
export type PromptDetail = { id: string; name: string; description: string; category: string; body: string; files: PromptFile[]; author: Author };
export type ListOpts = { q?: string; category?: string };
export type NewPromptFile = { path: string; content: string; language?: string };
export type NewPrompt = { name: string; description: string; category: string; body?: string; files?: NewPromptFile[] };

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
  const files = data.files?.length
    ? data.files.map((f) => ({ path: f.path, content: f.content, language: f.language || languageFromPath(f.path) }))
    : undefined;
  const body = data.body ?? (files ? files.map((f) => f.content).join("\n\n") : "");
  const doc: Record<string, unknown> = { ownerEmail, name: data.name, description: data.description, category: data.category, body, createdAt: new Date() };
  if (files) doc.files = files;
  const { insertedId } = await db.collection("prompts").insertOne(doc);
  return { id: insertedId.toString(), name: data.name, description: data.description, category: data.category };
}

export async function getPrompt(db: Db, id: string): Promise<PromptWithBody | null> {
  if (!ObjectId.isValid(id)) return null;
  const row = await db.collection("prompts").findOne({ _id: new ObjectId(id) });
  return row
    ? { id: row._id.toString(), name: row.name, description: row.description, category: row.category, body: row.body, ownerEmail: row.ownerEmail }
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
  };
}
