import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { getPrompt, getPromptDetail, updatePrompt, deletePrompt, setPromptEmbedding } from "@/lib/prompts";
import { canViewPrompt } from "@/lib/promptAuthz";
import { newPromptSchema } from "@/lib/promptInput";
import { embedText, embeddingTextFor } from "@/lib/embeddings";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const db = await getDb();

  // Fetch with body/owner info to enforce privacy gate.
  const prompt = await getPrompt(db, params.id);
  if (!prompt) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Privacy gate: owner, shared-viewers, and collaborators may see a private prompt.
  if (!canViewPrompt(prompt, session?.user?.email)) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  // Return the rich detail object (files, image, stars, testedModels, author, handle/slug).
  // Pass the viewer's email so isStarred reflects their own star state.
  const detail = await getPromptDetail(db, params.id, session?.user?.email);
  if (!detail) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(detail);
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = newPromptSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const { message, ...data } = parsed.data;
  try {
    const db = await getDb();
    const ok = await updatePrompt(db, params.id, email, { ...data, image: data.image || undefined }, { message, trackRemovals: true });
    if (!ok) return NextResponse.json({ error: "Not found or not yours" }, { status: 404 });
    // Refresh the semantic embedding for the edited text (best-effort).
    try {
      const vec = await embedText(embeddingTextFor({ name: data.name, description: data.description, tags: data.tags }));
      if (vec) await setPromptEmbedding(db, params.id, vec);
    } catch {
      /* embedding is optional */
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to update prompt";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const ok = await deletePrompt(await getDb(), params.id, email);
  if (!ok) return NextResponse.json({ error: "Not found or not yours" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
