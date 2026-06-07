import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getPromptDetailByHandleAndSlug, incrementCopyCount } from "@/lib/prompts";
import { buildManifest } from "@/lib/manifest";

// Install manifest consumed by the `promptinghub` CLI (`npx promptinghub add owner/slug`).
export async function GET(_req: Request, { params }: { params: { handle: string; slug: string } }) {
  const db = await getDb();
  const detail = await getPromptDetailByHandleAndSlug(db, params.handle, params.slug);
  if (!detail) return NextResponse.json({ error: "Not found" }, { status: 404 });
  // A CLI install is a real usage signal — count it.
  await incrementCopyCount(db, detail.id);
  return NextResponse.json(buildManifest(detail));
}
