import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getPromptDetailByHandleAndSlug } from "@/lib/prompts";
import { buildManifest } from "@/lib/manifest";

// Install manifest consumed by the `promptinghub` CLI (`npx promptinghub add owner/slug`).
export async function GET(_req: Request, { params }: { params: { handle: string; slug: string } }) {
  const detail = await getPromptDetailByHandleAndSlug(await getDb(), params.handle, params.slug);
  if (!detail) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(buildManifest(detail));
}
