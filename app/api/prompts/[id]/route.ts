import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { getPrompt, getPromptDetail } from "@/lib/prompts";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const db = await getDb();

  // Fetch with body/owner info to enforce privacy gate.
  const prompt = await getPrompt(db, params.id);
  if (!prompt) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Check if user has access to private prompt
  if (prompt.isPrivate) {
    const userEmail = session?.user?.email;
    const hasAccess =
      userEmail === prompt.ownerEmail ||
      prompt.sharedWith.includes(userEmail || "");

    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
  }

  // Return the rich detail object (files, image, stars, testedModels, author, handle/slug).
  const detail = await getPromptDetail(db, params.id);
  if (!detail) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(detail);
}
