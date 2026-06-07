import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { parsePastedPrompt } from "@/lib/import";

// Preview-only: parse pasted text into a draft the user reviews before publishing.
// Deliberately does NOT write to the DB — the /new form submits the (possibly edited) draft.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const data = (await req.json().catch(() => null)) as { text?: string; source?: string } | null;
  if (!data || typeof data.text !== "string") {
    return NextResponse.json({ error: "Provide { text }" }, { status: 400 });
  }
  const draft = parsePastedPrompt(data.text, data.source || "paste");
  if (!draft) return NextResponse.json({ error: "Nothing to import" }, { status: 422 });
  return NextResponse.json({ draft });
}
