import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { isVerifiedEmail } from "@/lib/users";
import { resolveReport } from "@/lib/reports";

// Resolve/dismiss a report — verified accounts only.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await getDb();
  if (!(await isVerifiedEmail(db, email))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const status = body?.status === "resolved" ? "resolved" : "dismissed";
  const ok = await resolveReport(db, params.id, status);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
