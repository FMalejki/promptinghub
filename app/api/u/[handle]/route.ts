import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCreatorProfile } from "@/lib/users";
import { listPrompts } from "@/lib/prompts";
import { listCollectionsByOwner } from "@/lib/collections";

// Public creator page data, resolved by @handle (no email exposed in the URL).
export async function GET(_req: Request, { params }: { params: { handle: string } }) {
  const db = await getDb();
  const creator = await getCreatorProfile(db, params.handle);
  if (!creator) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const [prompts, collections] = await Promise.all([
    listPrompts(db, { ownerEmail: creator.email }),
    listCollectionsByOwner(db, creator.email),
  ]);
  // Keep the email out of the public payload.
  const { email, ...publicCreator } = creator;
  return NextResponse.json({
    creator: publicCreator,
    prompts,
    collections: collections.map((c) => ({ id: c.id, name: c.name, count: c.promptIds.length })),
  });
}
