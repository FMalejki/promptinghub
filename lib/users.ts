import { Db } from "mongodb";
import bcrypt from "bcryptjs";

export type User = { id: string; email: string };

export async function createUser(db: Db, email: string, password: string): Promise<User> {
  const users = db.collection("users");
  if (await users.findOne({ email })) throw new Error("User already exists");
  const passwordHash = await bcrypt.hash(password, 10);
  const { insertedId } = await users.insertOne({ email, passwordHash, createdAt: new Date() });
  return { id: insertedId.toString(), email };
}

export async function verifyCredentials(db: Db, email: string, password: string): Promise<User | null> {
  const row = await db.collection("users").findOne({ email });
  if (!row) return null;
  const ok = await bcrypt.compare(password, row.passwordHash);
  return ok ? { id: row._id.toString(), email: row.email } : null;
}
