import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { getPromptDetailByHandleAndSlug } from "@/lib/prompts";

export async function GET(_req: Request, { params }: { params: { handle: string; slug: string } }) {
  const session = await getServerSession(authOptions);
  const detail = await getPromptDetailByHandleAndSlug(await getDb(), params.handle, params.slug, session?.user?.email);
  if (!detail) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(detail);
}
