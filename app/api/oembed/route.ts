import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getPromptDetail, getPromptDetailByHandleAndSlug } from "@/lib/prompts";
import { buildOEmbed, parseOEmbedTarget } from "@/lib/oembed";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://promptinghub-night-shift.vercel.app";

// oEmbed endpoint: ?url=<prompt url>[&maxwidth=&maxheight=].
// Accepts /prompt/<id>, /embed/<id>, or the canonical /p/<handle>/<slug> form.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");
  if (!url) return NextResponse.json({ error: "Missing url" }, { status: 400 });

  const target = parseOEmbedTarget(url);
  if (!target) return NextResponse.json({ error: "Unrecognized url" }, { status: 404 });

  const num = (k: string) => {
    const v = Number(searchParams.get(k));
    return Number.isFinite(v) && v > 0 ? v : undefined;
  };

  const db = await getDb();
  const prompt =
    target.kind === "id"
      ? await getPromptDetail(db, target.id)
      : await getPromptDetailByHandleAndSlug(db, target.handle, target.slug);
  if (!prompt || prompt.isPrivate) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const payload = buildOEmbed(
    SITE_URL,
    { id: prompt.id, name: prompt.name, author: { name: prompt.author.name } },
    { maxwidth: num("maxwidth"), maxheight: num("maxheight") },
  );
  return NextResponse.json(payload);
}
