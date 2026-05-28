import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { getProfile, updateProfile } from "@/lib/users";

export async function GET() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await getProfile(await getDb(), email));
}

const schema = z.object({
  name: z.string().min(1).max(60).optional(),
  image: z.string().url().max(500).or(z.literal("")).optional(),
});

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const patch = { ...parsed.data, image: parsed.data.image === "" ? null : parsed.data.image };
  return NextResponse.json(await updateProfile(await getDb(), email, patch));
}
