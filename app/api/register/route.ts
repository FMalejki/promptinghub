import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { createUser } from "@/lib/users";

const schema = z.object({ email: z.string().email(), password: z.string().min(8) });

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  try {
    const user = await createUser(await getDb(), parsed.data.email, parsed.data.password);
    return NextResponse.json({ id: user.id, email: user.email });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 409 });
  }
}
