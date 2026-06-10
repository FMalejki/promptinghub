import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getPromptDetail } from "@/lib/prompts";
import { rawPromptText } from "@/lib/promptText";
import { promptToMarkdown, markdownFilename } from "@/lib/promptMarkdown";

// Prompt content for piping, e.g. `curl .../api/prompts/<id>/raw | pbcopy`.
// ?format=md returns a readable Markdown doc; default is plain text.
// ?format=md&download=1 forces a file download (Content-Disposition).
// Public prompts only (private → 404, no content leak).
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const detail = await getPromptDetail(await getDb(), params.id);
  if (!detail || detail.isPrivate) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const params2 = new URL(req.url).searchParams;
  if (params2.get("format") === "md") {
    const headers: Record<string, string> = {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
    };
    if (params2.has("download")) {
      headers["Content-Disposition"] = `attachment; filename="${markdownFilename(detail.name)}"`;
    }
    return new Response(
      promptToMarkdown({ name: detail.name, description: detail.description, body: detail.body, files: detail.files }),
      { headers },
    );
  }

  return new Response(rawPromptText({ body: detail.body, files: detail.files }), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
    },
  });
}
