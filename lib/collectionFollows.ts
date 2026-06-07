import { Db, ObjectId } from "mongodb";
import { getCollection } from "./collections";
import { addNotification } from "./notifications";

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

// Fan out a "new prompt in a collection you follow" notification to every
// subscriber except the actor. Returns the number notified. Best-effort: the
// caller wraps this in try/catch so it never breaks adding the prompt.
export async function notifyCollectionSubscribers(
  db: Db,
  collectionId: string,
  actorEmail: string,
  promptName?: string,
): Promise<number> {
  const collection = await getCollection(db, collectionId);
  if (!collection) return 0;
  const subs = await db
    .collection("collectionFollows")
    .find({ collectionId, followerEmail: { $ne: actorEmail } })
    .toArray();

  let notified = 0;
  for (const s of subs) {
    await addNotification(db, {
      recipientEmail: s.followerEmail,
      type: "collection",
      actorEmail,
      promptId: collectionId,
      promptName,
      text: `added a prompt to “${collection.name}”`,
    });
    notified++;
  }
  return notified;
}
