import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { nameTokens, rankSimilar } from "@/lib/similar";

// Suggest existing public prompts with a similar name (duplicate-warning on create).
export async function GET(req: Request) {
  const url = new URL(req.url);
  const name = url.searchParams.get("name") || "";
  const excludeId = url.searchParams.get("excludeId") || undefined;

  const tokens = [...nameTokens(name)].filter((t) => t.length >= 3);
  if (tokens.length === 0) return NextResponse.json({ similar: [] });

  const db = await getDb();
  // Prefilter to public prompts whose name contains any significant token, then rank in JS.
  const regex = tokens.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const rows = await db
    .collection("prompts")
    .find({ isPrivate: { $ne: true }, name: { $regex: regex, $options: "i" } }, { projection: { name: 1 } })
    .limit(50)
    .toArray();

  const candidates = rows.map((r) => ({ id: r._id.toString(), name: r.name as string }));
  const similar = rankSimilar(name, candidates, { threshold: 0.34, limit: 5, excludeId });
  return NextResponse.json({ similar });
}
