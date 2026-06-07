import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { restoreVersion } from "@/lib/versions";

// Restore a past version as the current content — owner only.
export async function POST(_req: Request, { params }: { params: { id: string; version: string } }) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const version = parseInt(params.version, 10);
  if (!Number.isFinite(version)) return NextResponse.json({ error: "Invalid version" }, { status: 400 });
  const ok = await restoreVersion(await getDb(), params.id, email, version);
  if (!ok) return NextResponse.json({ error: "Not found or not yours" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
