import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { pickRandom } from "@/lib/randomPick";

export const dynamic = "force-dynamic";

// "Surprise me": redirect to a random public prompt. Falls back to /browse when
// the catalog is empty or the DB is unavailable.
export async function GET(req: Request) {
  try {
    const db = await getDb();
    const rows = await db
      .collection("prompts")
      .find({ isPrivate: { $ne: true } }, { projection: { _id: 1 } })
      .toArray();
    const ids = rows.map((r) => r._id.toString());
    const id = pickRandom(ids);
    if (id) return NextResponse.redirect(new URL(`/prompt/${id}`, req.url), 307);
  } catch {
    /* fall through to browse */
  }
  return NextResponse.redirect(new URL("/browse", req.url), 307);
}
