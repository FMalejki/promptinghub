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
