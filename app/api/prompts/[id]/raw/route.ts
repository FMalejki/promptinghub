import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getPromptDetail } from "@/lib/prompts";
import { rawPromptText } from "@/lib/promptText";

// Plain-text prompt body for piping, e.g. `curl .../api/prompts/<id>/raw | pbcopy`.
// Public prompts only (private → 404, no content leak).
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const detail = await getPromptDetail(await getDb(), params.id);
  if (!detail || detail.isPrivate) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return new Response(rawPromptText({ body: detail.body, files: detail.files }), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
    },
  });
}
