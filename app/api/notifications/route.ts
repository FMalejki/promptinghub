import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { listNotifications, countUnread, markAllRead } from "@/lib/notifications";

// GET → recent notifications + unread count for the signed-in user.
export async function GET() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await getDb();
  return NextResponse.json({ notifications: await listNotifications(db, email), unread: await countUnread(db, email) });
}

// POST → mark all as read.
export async function POST() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const marked = await markAllRead(await getDb(), email);
  return NextResponse.json({ ok: true, marked });
}
