import { Db, ObjectId } from "mongodb";

export const MAX_PINS = 3;

export type PinResult = { ok: true; pinned: string[] } | { ok: false; error: "not_owner" | "max" | "not_found" };

export async function getPinnedPromptIds(db: Db, email: string): Promise<string[]> {
  const u = await db.collection("users").findOne({ email }, { projection: { pinnedPrompts: 1 } });
  return (u?.pinnedPrompts as string[]) || [];
}

// Toggle a prompt's pinned state on the owner's profile. Owner-only, capped at MAX_PINS.
export async function togglePin(db: Db, email: string, promptId: string): Promise<PinResult> {
  if (!ObjectId.isValid(promptId)) return { ok: false, error: "not_found" };
  const prompt = await db.collection("prompts").findOne({ _id: new ObjectId(promptId) }, { projection: { ownerEmail: 1 } });
  if (!prompt) return { ok: false, error: "not_found" };
  if (prompt.ownerEmail !== email) return { ok: false, error: "not_owner" };

  const current = await getPinnedPromptIds(db, email);
  let next: string[];
  if (current.includes(promptId)) {
    next = current.filter((id) => id !== promptId);
  } else {
    if (current.length >= MAX_PINS) return { ok: false, error: "max" };
    next = [...current, promptId];
  }
  await db.collection("users").updateOne({ email }, { $set: { pinnedPrompts: next } });
  return { ok: true, pinned: next };
}
