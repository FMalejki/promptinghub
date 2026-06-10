import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCollectionExport } from "@/lib/collections";
import { collectionToMarkdown } from "@/lib/collectionMarkdown";
import { slugify } from "@/lib/slug";

// Downloadable bundle of a collection (all prompts + their files).
// ?format=md returns a readable Markdown document; default is the JSON bundle.
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const bundle = await getCollectionExport(await getDb(), params.id);
  if (!bundle) return NextResponse.json({ error: "Not found" }, { status: 404 });
  // Use the canonical slugify (strips diacritics, caps length) so the download
  // filename matches the collection's real slug instead of a weaker inline regex.
  const slug = slugify(bundle.name) || "collection";

  if (new URL(req.url).searchParams.get("format") === "md") {
    return new NextResponse(collectionToMarkdown(bundle), {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${slug}.md"`,
      },
    });
  }

  return new NextResponse(JSON.stringify(bundle, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${slug}.json"`,
    },
  });
}
