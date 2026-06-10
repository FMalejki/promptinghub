import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { listSharedWithMe } from "@/lib/prompts";

// Locked prompts that have been shared with the signed-in user. Card fields
// only — no decrypted content, no allowlist.
export async function GET() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const prompts = await listSharedWithMe(await getDb(), email);
  return NextResponse.json({ prompts });
}
