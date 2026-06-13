import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ObjectId } from "mongodb";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { updatePrompt, filterSyncedFiles } from "@/lib/prompts";
import { parseRepoRef } from "@/lib/githubImport";
import { importRepo, serverGithubToken } from "@/lib/githubFetch";
import { enforceRateLimit, MIN } from "@/lib/apiRateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/prompts/:id/sync-github — re-pull the linked repo's files to its latest
// commit. Owner-only. Body may carry a { token } for private repos.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Sync also fans out to GitHub — throttle per user.
  const limited = await enforceRateLimit(req, "gh-sync", 20, 10 * MIN, email);
  if (limited) return limited;

  const { id } = params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const db = await getDb();
  const row = await db.collection("prompts").findOne({ _id: new ObjectId(id) }, { projection: { ownerEmail: 1, sourceUrl: 1, sourceCommit: 1, removedPaths: 1 } });
  if (!row) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (row.ownerEmail !== email) return NextResponse.json({ error: "Only the owner can sync this prompt." }, { status: 403 });
  if (!row.sourceUrl) return NextResponse.json({ error: "This prompt isn't linked to a GitHub repo." }, { status: 400 });

  const ref = parseRepoRef(String(row.sourceUrl));
  if (!ref) return NextResponse.json({ error: "Stored repo link is invalid." }, { status: 400 });

  const body = (await req.json().catch(() => null)) as { token?: string } | null;
  const userToken = typeof body?.token === "string" && body.token.trim() ? body.token.trim() : undefined;

  const result = await importRepo(ref, userToken || serverGithubToken());
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

  const newCommit = result.draft.source?.commit ?? null;
  const before = (row.sourceCommit as string | undefined) ?? null;
  const alreadyCurrent = !!newCommit && !!before && newCommit === before;

  // Respect files the owner manually deleted: don't let a re-pull resurrect them.
  // trackRemovals is OFF here so the tombstones (set by editor saves) survive.
  const removedPaths = Array.isArray(row.removedPaths) ? (row.removedPaths as string[]) : [];
  const files = filterSyncedFiles(result.draft.files, removedPaths);
  const skipped = result.draft.files.length - files.length;

  // Re-pull files even when the commit matches (lets the owner restore from the
  // repo); updatePrompt snapshots the prior content as a version.
  const ok = await updatePrompt(
    db,
    id,
    email,
    { files, sourceCommit: newCommit ?? undefined },
    { message: `Synced from GitHub${newCommit ? ` @ ${newCommit.slice(0, 7)}` : ""}` },
  );
  if (!ok) return NextResponse.json({ error: "Could not update the prompt." }, { status: 500 });

  return NextResponse.json({
    ok: true,
    imported: files.length,
    skipped,
    commit: newCommit,
    previousCommit: before,
    alreadyCurrent,
  });
}
