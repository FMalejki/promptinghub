import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { getPrompt } from "@/lib/prompts";
import { getProfile } from "@/lib/users";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const db = await getDb();
  const prompt = await getPrompt(db, params.id);

  if (!prompt) {
    return NextResponse.json({ error: "Prompt not found" }, { status: 404 });
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

  // Get author info
  const author = await getProfile(db, prompt.ownerEmail);

  return NextResponse.json({
    prompt,
    author: author || { email: prompt.ownerEmail, name: prompt.ownerEmail.split("@")[0], image: null },
  });
}

// Made with Bob
