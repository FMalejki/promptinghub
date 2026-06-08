import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { deleteAccount } from "@/lib/users";

// Permanently delete the signed-in user's account and everything they own.
// Requires an explicit { confirm: "<email>" } body matching the session email.
export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || body.confirm !== email) {
    return NextResponse.json({ error: "Type your email to confirm deletion" }, { status: 400 });
  }

  const summary = await deleteAccount(await getDb(), email);
  if (!summary) return NextResponse.json({ error: "Account not found" }, { status: 404 });
  return NextResponse.json({ ok: true, ...summary });
}
