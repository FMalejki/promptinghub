import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getPromptDetail } from "@/lib/prompts";
import { promptToText } from "@/lib/promptText";
import { lintPrompt } from "@/lib/promptLint";

// Advisory quality report for a public prompt — the same heuristics the editor
// shows live, exposed for tooling/CI. Public prompts only (private → 404).
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const detail = await getPromptDetail(await getDb(), params.id);
  if (!detail || detail.isPrivate) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const text = [detail.description, promptToText({ body: detail.body, files: detail.files })]
    .filter(Boolean)
    .join("\n\n");

  return NextResponse.json(lintPrompt(text), {
    headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600" },
  });
}
