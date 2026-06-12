import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { createCollection, listCollectionsByOwner } from "@/lib/collections";
import { enforceRateLimit, MIN } from "@/lib/apiRateLimit";

const newCollectionSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(300).optional(),
});

// List a user's collections: /api/collections?owner=email (defaults to the signed-in user).
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  const owner = new URL(req.url).searchParams.get("owner") || session?.user?.email;
  if (!owner) return NextResponse.json({ collections: [] });
  const collections = await listCollectionsByOwner(await getDb(), owner);
  return NextResponse.json({ collections });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const limited = await enforceRateLimit(req, "collection-create", 30, 10 * MIN, email);
  if (limited) return limited;
  const parsed = newCollectionSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const created = await createCollection(await getDb(), email, parsed.data);
  return NextResponse.json(created, { status: 201 });
}
