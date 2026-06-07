import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { createApiKey, listApiKeys } from "@/lib/apiKeys";

export async function GET() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ keys: await listApiKeys(await getDb(), email) });
}

const schema = z.object({ name: z.string().min(1).max(80) });

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  // The raw `key` is returned ONCE here and never again.
  const created = await createApiKey(await getDb(), email, parsed.data.name);
  return NextResponse.json(created, { status: 201 });
}
