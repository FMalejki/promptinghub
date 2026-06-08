import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { AI_MODELS } from "@/lib/constants";
import { attestModel, removeAttestation, getModelSummary, isValidVote } from "@/lib/modelAttestations";

const MODEL_IDS = new Set(AI_MODELS.map((m) => m.id));

// Community "does this prompt work on model X?" attestations.
// GET is public (includes the viewer's own votes when signed in); POST/DELETE
// require a session.
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  try {
    const models = await getModelSummary(await getDb(), params.id, session?.user?.email);
    return NextResponse.json({ models });
  } catch {
    return NextResponse.json({ models: [] });
  }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const modelId = typeof body?.modelId === "string" ? body.modelId : "";
  const vote = body?.vote;
  if (!MODEL_IDS.has(modelId)) return NextResponse.json({ error: "Unknown model" }, { status: 400 });
  if (!isValidVote(vote)) return NextResponse.json({ error: "Invalid vote" }, { status: 400 });

  const db = await getDb();
  await attestModel(db, params.id, email, modelId, vote);
  return NextResponse.json({ models: await getModelSummary(db, params.id, email) });
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const modelId = typeof body?.modelId === "string" ? body.modelId : "";
  if (!modelId) return NextResponse.json({ error: "Missing model" }, { status: 400 });

  const db = await getDb();
  await removeAttestation(db, params.id, email, modelId);
  return NextResponse.json({ models: await getModelSummary(db, params.id, email) });
}
