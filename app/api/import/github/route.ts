import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { parseRepoRef, type RepoRef } from "@/lib/githubImport";
import { importRepo, serverGithubToken } from "@/lib/githubFetch";
import { enforceRateLimit, MIN } from "@/lib/apiRateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Each import fans out to many GitHub API + raw fetches — throttle hard so it
  // can't be used to hammer GitHub (or our own functions) through us.
  const limited = await enforceRateLimit(req, "gh-import", 15, 10 * MIN, session.user.email);
  if (limited) return limited;

  const body = (await req.json().catch(() => null)) as { url?: string; token?: string } | null;
  const ref: RepoRef | null = parseRepoRef(body?.url || "");
  if (!ref) return NextResponse.json({ error: "Not a valid GitHub repo URL." }, { status: 400 });
  // User-supplied token wins; otherwise fall back to a server token so imports
  // survive GitHub's unauthenticated rate limit and reach private repos.
  const userToken = typeof body?.token === "string" && body.token.trim() ? body.token.trim() : undefined;
  const token = userToken || serverGithubToken();

  const result = await importRepo(ref, token);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ draft: result.draft });
}
