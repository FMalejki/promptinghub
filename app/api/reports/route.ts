import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { isVerifiedEmail } from "@/lib/users";
import { listOpenReports } from "@/lib/reports";
import { listOpenCommentReports } from "@/lib/commentReports";

// Moderation queue — verified accounts only. Returns both prompt and comment reports.
export async function GET() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await getDb();
  if (!(await isVerifiedEmail(db, email))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const [reports, commentReports] = await Promise.all([listOpenReports(db), listOpenCommentReports(db)]);
  return NextResponse.json({ reports, commentReports });
}
