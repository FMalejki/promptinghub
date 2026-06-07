import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { listVersions } from "@/lib/versions";

// Edit history for a prompt (newest-first). Public — same visibility as the prompt.
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const versions = await listVersions(await getDb(), params.id);
  return NextResponse.json({ versions });
}
