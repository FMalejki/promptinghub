import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { runIngest } from "@/lib/ingest";
import { twitterSource } from "@/lib/sources/twitter";

export const dynamic = "force-dynamic";

// Daily prompt ingestion (Vercel Cron — see vercel.json).
// Protected by CRON_SECRET: Vercel sends `Authorization: Bearer <CRON_SECRET>`.
// Honest: with no TWITTER_BEARER_TOKEN the source is disabled and this is a no-op.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }
  const query = process.env.INGEST_QUERY || "ai prompt";
  const result = await runIngest(await getDb(), twitterSource, query);
  return NextResponse.json({ source: twitterSource.id, query, ...result });
}
