import { Db } from "mongodb";
import bcrypt from "bcryptjs";

export type User = { id: string; email: string; name: string; image: string | null };
export type Profile = { email: string; name: string; image: string | null };

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
