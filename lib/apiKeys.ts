import { Db, ObjectId } from "mongodb";
import { createHash, randomBytes } from "crypto";

export type ApiKeyInfo = {
  id: string;
  name: string;
  prefix: string;
  createdAt: Date;
  lastUsedAt: Date | null;
};

function hashKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

/**
 * Create an API key. The raw key is returned ONCE (never stored) — only its
 * SHA-256 hash and a short display prefix are persisted.
 */
export async function createApiKey(db: Db, ownerEmail: string, name: string): Promise<{ id: string; key: string; prefix: string }> {
  const secret = randomBytes(24).toString("base64url");
  const key = `ph_${secret}`;
  const prefix = key.slice(0, 11); // "ph_" + first 8 chars, enough to recognize, not to use
  const { insertedId } = await db.collection("apiKeys").insertOne({
    ownerEmail,
    name: name.trim().slice(0, 80) || "API key",
    prefix,
    keyHash: hashKey(key),
    createdAt: new Date(),
    lastUsedAt: null,
  });
  return { id: insertedId.toString(), key, prefix };
}

// Metadata only — never the hash or raw key.
export async function listApiKeys(db: Db, ownerEmail: string): Promise<ApiKeyInfo[]> {
  const rows = await db.collection("apiKeys").find({ ownerEmail }).sort({ createdAt: -1 }).toArray();
  return rows.map((r) => ({
    id: r._id.toString(),
    name: r.name,
    prefix: r.prefix,
    createdAt: r.createdAt,
    lastUsedAt: r.lastUsedAt ?? null,
  }));
}

// Resolve a raw key to its owner email, touching lastUsedAt. Null if unknown.
export async function verifyApiKey(db: Db, key: string): Promise<string | null> {
  if (!key || !key.startsWith("ph_")) return null;
  const row = await db.collection("apiKeys").findOneAndUpdate(
    { keyHash: hashKey(key) },
    { $set: { lastUsedAt: new Date() } }
  );
  const doc = (row as { value?: { ownerEmail?: string } } | null)?.value ?? (row as { ownerEmail?: string } | null);
  return doc?.ownerEmail ?? null;
}

export async function revokeApiKey(db: Db, id: string, ownerEmail: string): Promise<boolean> {
  if (!ObjectId.isValid(id)) return false;
  const res = await db.collection("apiKeys").deleteOne({ _id: new ObjectId(id), ownerEmail });
  return res.deletedCount > 0;
}
