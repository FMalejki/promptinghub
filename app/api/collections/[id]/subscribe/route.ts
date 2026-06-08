import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { subscribeCollection, unsubscribeCollection, isSubscribed, countSubscribers } from "@/lib/collectionFollows";

// GET → subscriber count + whether the signed-in user is subscribed.
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const db = await getDb();
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  const subscribed = email ? await isSubscribed(db, email, params.id) : false;
  return NextResponse.json({ subscribed, subscribers: await countSubscribers(db, params.id) });
}

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const ok = await subscribeCollection(await getDb(), email, params.id);
  if (!ok) return NextResponse.json({ error: "Cannot subscribe" }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await unsubscribeCollection(await getDb(), email, params.id);
  return NextResponse.json({ ok: true });
}
