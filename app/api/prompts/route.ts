import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { listPrompts, createPrompt } from "@/lib/prompts";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  const url = new URL(req.url);
  const q = url.searchParams.get("q") || undefined;
  const category = url.searchParams.get("category") || undefined;
  const sort = (url.searchParams.get("sort") as "recent" | "popular") || "recent";
  const ownerEmail = url.searchParams.get("owner") || undefined;
  
  const db = await getDb();
  const prompts = await listPrompts(db, {
    q,
    category,
    sort,
    ownerEmail,
    includePrivate: !!session?.user?.email,
    userEmail: session?.user?.email || undefined,
  });
  
  return NextResponse.json({ prompts });
}

const testedModelSchema = z.object({
  modelId: z.string().min(1),
  version: z.string().optional(),
  notes: z.string().optional(),
});

const schema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().min(1).max(300),
  category: z.string().min(1).max(40),
  body: z.string().min(1).max(5000),
  image: z.string().url().optional().or(z.literal("")),
  isPrivate: z.boolean().optional(),
  testedModels: z.array(testedModelSchema).optional(),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const created = await createPrompt(await getDb(), email, {
    ...parsed.data,
    image: parsed.data.image || undefined,
  });
  return NextResponse.json(created, { status: 201 });
}
