import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCollectionExport } from "@/lib/collections";

// Downloadable JSON bundle of a collection (all prompts + their files).
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const bundle = await getCollectionExport(await getDb(), params.id);
  if (!bundle) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const slug = bundle.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "collection";
  return new NextResponse(JSON.stringify(bundle, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${slug}.json"`,
    },
  });
}
