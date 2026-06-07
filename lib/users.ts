import { Db } from "mongodb";
import bcrypt from "bcryptjs";
import { slugify } from "./slug";
import { isVerifiedHandle } from "./verified";

export type User = { id: string; email: string; name: string; image: string | null };
export type Profile = { email: string; name: string; image: string | null };
export type Creator = Profile & { handle: string; verified: boolean };

// Returns the user's stable @handle, generating + persisting a unique one on first call.
export async function ensureHandle(db: Db, email: string): Promise<string> {
  const users = db.collection("users");
  const row = await users.findOne({ email });
  if (!row) throw new Error("User not found");
  if (row.handle) return row.handle as string;

  const base = slugify(email.split("@")[0]);
  let handle = base;
  for (let n = 2; await users.findOne({ handle }); n++) handle = `${base}-${n}`;
  await users.updateOne({ email }, { $set: { handle } });
  return handle;
}

export async function getUserByHandle(db: Db, handle: string): Promise<(Profile & { handle: string }) | null> {
  const row = await db.collection("users").findOne({ handle });
  return row ? { email: row.email, name: row.name, image: row.image ?? null, handle: row.handle } : null;
}

// True only when the account's handle is a verified one (used to gate curation).
export async function isVerifiedEmail(db: Db, email: string): Promise<boolean> {
  const row = await db.collection("users").findOne({ email });
  return !!row?.handle && isVerifiedHandle(row.handle);
}

// Public creator profile resolved by handle, with verified flag. Null if unknown.
export async function getCreatorProfile(db: Db, handle: string): Promise<Creator | null> {
  const u = await getUserByHandle(db, handle);
  if (!u) return null;
  return { ...u, verified: isVerifiedHandle(u.handle) };
}

export async function createUser(db: Db, email: string, password: string, name?: string): Promise<User> {
  const users = db.collection("users");
  if (await users.findOne({ email })) throw new Error("User already exists");
  const displayName = name?.trim() || email.split("@")[0];
  const passwordHash = await bcrypt.hash(password, 10);
  const { insertedId } = await users.insertOne({ email, passwordHash, name: displayName, image: null, createdAt: new Date() });
  return { id: insertedId.toString(), email, name: displayName, image: null };
}

export async function verifyCredentials(db: Db, email: string, password: string): Promise<User | null> {
  const row = await db.collection("users").findOne({ email });
  if (!row) return null;
  const ok = await bcrypt.compare(password, row.passwordHash);
  return ok ? { id: row._id.toString(), email: row.email, name: row.name, image: row.image ?? null } : null;
}

export async function getProfile(db: Db, email: string): Promise<Profile | null> {
  const row = await db.collection("users").findOne({ email });
  return row ? { email: row.email, name: row.name, image: row.image ?? null } : null;
}

export async function updateProfile(db: Db, email: string, patch: { name?: string; image?: string | null }): Promise<Profile | null> {
  const set: Record<string, unknown> = {};
  if (patch.name !== undefined) set.name = patch.name;
  if (patch.image !== undefined) set.image = patch.image;
  await db.collection("users").updateOne({ email }, { $set: set });
  return getProfile(db, email);
}

export type ExportedPrompt = {
  name: string;
  description: string;
  category: string;
  body: string;
  files: unknown;
  tags: string[];
  isPrivate: boolean;
  priceCents: number;
  copyCount: number;
  createdAt: Date;
};
export type ExportedCollection = { name: string; description: string; slug: string; promptIds: string[]; createdAt: Date };
export type AccountExport = {
  email: string;
  profile: { email: string; name: string; image: string | null; handle: string | null; createdAt: Date | null };
  prompts: ExportedPrompt[];
  collections: ExportedCollection[];
  exportedAt: Date;
};

/**
 * A portable, sanitized snapshot of everything an account owns — for a
 * "download my data" button. Never includes the password hash. Returns null
 * if the account is unknown.
 */
export async function exportAccountData(db: Db, email: string): Promise<AccountExport | null> {
  const user = await db.collection("users").findOne({ email });
  if (!user) return null;

  const promptRows = await db.collection("prompts").find({ ownerEmail: email }).sort({ createdAt: 1 }).toArray();
  const collectionRows = await db.collection("collections").find({ ownerEmail: email }).sort({ createdAt: 1 }).toArray();

  return {
    email,
    profile: {
      email: user.email,
      name: user.name ?? email.split("@")[0],
      image: user.image ?? null,
      handle: user.handle ?? null,
      createdAt: user.createdAt ?? null,
    },
    prompts: promptRows.map((p) => ({
      name: p.name,
      description: p.description,
      category: p.category,
      body: p.body ?? "",
      files: p.files ?? null,
      tags: p.tags ?? [],
      isPrivate: !!p.isPrivate,
      priceCents: p.priceCents ?? 0,
      copyCount: p.copyCount ?? 0,
      createdAt: p.createdAt,
    })),
    collections: collectionRows.map((c) => ({
      name: c.name,
      description: c.description ?? "",
      slug: c.slug,
      promptIds: c.promptIds ?? [],
      createdAt: c.createdAt,
    })),
    exportedAt: new Date(),
  };
}

export type DeleteAccountSummary = { prompts: number; collections: number; comments: number; apiKeys: number };

/**
 * Permanently delete an account and everything it owns: prompts (+ their version
 * snapshots), collections, comments, API keys, and the user record. Also pulls
 * the user out of every other prompt's starredBy / sharedWith. Favorites live on
 * the user doc and go with it. Returns counts, or null if the account is unknown.
 */
export async function deleteAccount(db: Db, email: string): Promise<DeleteAccountSummary | null> {
  const user = await db.collection("users").findOne({ email });
  if (!user) return null;

  const ownedPrompts = await db.collection("prompts").find({ ownerEmail: email }, { projection: { _id: 1 } }).toArray();
  const promptIds = ownedPrompts.map((p) => p._id.toString());
  if (promptIds.length) {
    await db.collection("promptVersions").deleteMany({ promptId: { $in: promptIds } });
  }

  const prompts = (await db.collection("prompts").deleteMany({ ownerEmail: email })).deletedCount || 0;
  const collections = (await db.collection("collections").deleteMany({ ownerEmail: email })).deletedCount || 0;
  const comments = (await db.collection("comments").deleteMany({ authorEmail: email })).deletedCount || 0;
  const apiKeys = (await db.collection("apiKeys").deleteMany({ ownerEmail: email })).deletedCount || 0;

  // Remove this user from other people's prompts (stars + shares).
  await db.collection("prompts").updateMany(
    { $or: [{ starredBy: email }, { sharedWith: email }] },
    { $pull: { starredBy: email, sharedWith: email } } as any,
  );

  await db.collection("users").deleteOne({ email });
  return { prompts, collections, comments, apiKeys };
}
