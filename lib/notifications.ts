import { Db, ObjectId } from "mongodb";

export type NotificationType = "follow" | "comment" | "fork" | "reply" | "mention" | "collection" | "share";

// Canonical list (drives the Settings toggles + mute validation).
export const NOTIFICATION_TYPES: NotificationType[] = ["follow", "comment", "fork", "reply", "mention", "collection", "share"];

// Keep only valid, deduped notification types from arbitrary input (used when
// saving a user's muted-types preference).
export function sanitizeMutedTypes(input: unknown): NotificationType[] {
  if (!Array.isArray(input)) return [];
  const valid = new Set<string>(NOTIFICATION_TYPES);
  const out = new Set<NotificationType>();
  for (const v of input) if (typeof v === "string" && valid.has(v)) out.add(v as NotificationType);
  return Array.from(out);
}

export type NewNotification = {
  recipientEmail: string;
  type: NotificationType;
  actorEmail: string;
  actorName?: string;
  promptId?: string;
  promptName?: string;
  text?: string;
};

export type Notification = NewNotification & { id: string; read: boolean; createdAt: Date };

// Record a notification. No-op when the actor is the recipient (no self-notify).
// Best-effort: emission is wrapped by callers in try/catch so it never breaks the action.
export async function addNotification(db: Db, n: NewNotification): Promise<void> {
  if (!n.recipientEmail || n.recipientEmail === n.actorEmail) return;
  // Respect the recipient's muted notification types (best-effort: one cheap read).
  const recipient = await db
    .collection("users")
    .findOne({ email: n.recipientEmail }, { projection: { mutedNotificationTypes: 1 } });
  const muted = Array.isArray(recipient?.mutedNotificationTypes) ? (recipient!.mutedNotificationTypes as string[]) : [];
  if (muted.includes(n.type)) return;
  await db.collection("notifications").insertOne({
    recipientEmail: n.recipientEmail,
    type: n.type,
    actorEmail: n.actorEmail,
    actorName: n.actorName ?? null,
    promptId: n.promptId ?? null,
    promptName: n.promptName ?? null,
    text: n.text ?? null,
    read: false,
    createdAt: new Date(),
  });
}

export async function listNotifications(db: Db, email: string, limit = 50): Promise<Notification[]> {
  const rows = await db.collection("notifications").find({ recipientEmail: email }).sort({ createdAt: -1, _id: -1 }).limit(limit).toArray();
  return rows.map((r) => ({
    id: r._id.toString(),
    recipientEmail: r.recipientEmail,
    type: r.type,
    actorEmail: r.actorEmail,
    actorName: r.actorName ?? undefined,
    promptId: r.promptId ?? undefined,
    promptName: r.promptName ?? undefined,
    text: r.text ?? undefined,
    read: !!r.read,
    createdAt: r.createdAt,
  }));
}

export async function countUnread(db: Db, email: string): Promise<number> {
  return db.collection("notifications").countDocuments({ recipientEmail: email, read: { $ne: true } });
}

export async function markAllRead(db: Db, email: string): Promise<number> {
  const res = await db.collection("notifications").updateMany({ recipientEmail: email, read: { $ne: true } }, { $set: { read: true } });
  return res.modifiedCount || 0;
}

// Mark a single notification read — scoped to its recipient so you can only mark
// your own. Returns false for a malformed id or one that isn't yours.
export async function markRead(db: Db, id: string, email: string): Promise<boolean> {
  if (!ObjectId.isValid(id)) return false;
  const res = await db.collection("notifications").updateOne({ _id: new ObjectId(id), recipientEmail: email }, { $set: { read: true } });
  return res.matchedCount > 0;
}

// Resolve a display name for an actor email (best-effort).
export async function actorName(db: Db, email: string): Promise<string> {
  const u = await db.collection("users").findOne({ email }, { projection: { name: 1 } });
  return (u?.name as string) || email.split("@")[0];
}
