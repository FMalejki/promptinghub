import { Db, ObjectId } from "mongodb";
import { getCollection } from "./collections";

// Subscribing to a collection: a user follows a curated list so they can find
// it again and (later) be notified when it changes. One row per (user,
// collection); subscribing an unknown/malformed id is a no-op.

export async function subscribeCollection(db: Db, followerEmail: string, collectionId: string): Promise<boolean> {
  if (!ObjectId.isValid(collectionId)) return false;
  if (!(await getCollection(db, collectionId))) return false;
  const res = await db.collection("collectionFollows").updateOne(
    { followerEmail, collectionId },
    { $setOnInsert: { followerEmail, collectionId, createdAt: new Date() } },
    { upsert: true },
  );
  return res.upsertedCount > 0;
}

export async function unsubscribeCollection(db: Db, followerEmail: string, collectionId: string): Promise<boolean> {
  const res = await db.collection("collectionFollows").deleteOne({ followerEmail, collectionId });
  return res.deletedCount > 0;
}

export async function isSubscribed(db: Db, followerEmail: string, collectionId: string): Promise<boolean> {
  return !!(await db.collection("collectionFollows").findOne({ followerEmail, collectionId }));
}

export async function countSubscribers(db: Db, collectionId: string): Promise<number> {
  return db.collection("collectionFollows").countDocuments({ collectionId });
}

export async function listSubscribedCollectionIds(db: Db, followerEmail: string): Promise<string[]> {
  const rows = await db.collection("collectionFollows").find({ followerEmail }).toArray();
  return rows.map((r) => r.collectionId as string);
}
