import { Db, ObjectId } from "mongodb";

export type Author = { email: string; name: string; image: string | null };

export type TestedModel = {
  modelId: string;
  version?: string;
  notes?: string;
};

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

export type ListOpts = {
  q?: string;
  category?: string;
  ownerEmail?: string;
  sort?: "recent" | "popular";
  includePrivate?: boolean;
  userEmail?: string;
};

export type NewPrompt = {
  name: string;
  description: string;
  category: string;
  body: string;
  image?: string;
  isPrivate?: boolean;
  testedModels?: TestedModel[];
};

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
  if (opts.q) {
    const rx = { $regex: opts.q, $options: "i" };
    match.$or = [{ name: rx }, { description: rx }];
  }
  
  const sortField = opts.sort === "popular" ? { stars: -1, createdAt: -1 } : { createdAt: -1, _id: -1 };
  
  const rows = await db
    .collection("prompts")
    .aggregate([
      { $match: match },
      { $addFields: { stars: { $size: { $ifNull: ["$starredBy", []] } } } },
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
    createdAt: r.createdAt,
    author: { email: r.ownerEmail, name: r.u?.name || r.ownerEmail.split("@")[0], image: r.u?.image ?? null },
  }));
}

export async function listCategories(db: Db): Promise<string[]> {
  return ((await db.collection("prompts").distinct("category")) as string[]).sort();
}

export async function createPrompt(db: Db, ownerEmail: string, data: NewPrompt): Promise<Omit<Prompt, "author">> {
  const doc = {
    ownerEmail,
    name: data.name,
    description: data.description,
    category: data.category,
    body: data.body,
    image: data.image || null,
    isPrivate: data.isPrivate || false,
    testedModels: data.testedModels || [],
    starredBy: [],
    sharedWith: [],
    createdAt: new Date(),
  };
  const { insertedId } = await db.collection("prompts").insertOne(doc);
  return {
    id: insertedId.toString(),
    name: doc.name,
    description: doc.description,
    category: doc.category,
    image: doc.image,
    stars: 0,
    isPrivate: doc.isPrivate,
    testedModels: doc.testedModels,
    createdAt: doc.createdAt,
  };
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

export async function toggleStar(db: Db, promptId: string, userEmail: string): Promise<boolean> {
  if (!ObjectId.isValid(promptId)) return false;
  const prompt = await db.collection("prompts").findOne({ _id: new ObjectId(promptId) });
  if (!prompt) return false;
  
  const starredBy = (prompt.starredBy || []) as string[];
  const isStarred = starredBy.includes(userEmail);
  
  if (isStarred) {
    await db.collection("prompts").updateOne(
      { _id: new ObjectId(promptId) },
      { $pull: { starredBy: userEmail } as any }
    );
  } else {
    await db.collection("prompts").updateOne(
      { _id: new ObjectId(promptId) },
      { $addToSet: { starredBy: userEmail } as any }
    );
  }
  
  return !isStarred;
}

export async function addToFavorites(db: Db, userEmail: string, promptId: string): Promise<void> {
  await db.collection("users").updateOne(
    { email: userEmail },
    { $addToSet: { favorites: promptId } }
  );
}

export async function removeFromFavorites(db: Db, userEmail: string, promptId: string): Promise<void> {
  await db.collection("users").updateOne(
    { email: userEmail },
    { $pull: { favorites: promptId } }
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
    { $addToSet: { sharedWith: shareWithEmail } }
  );
  return true;
}
