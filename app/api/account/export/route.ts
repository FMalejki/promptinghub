import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { exportAccountData } from "@/lib/users";

// Download all of the signed-in user's data as a JSON attachment.
export async function GET() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const data = await exportAccountData(await getDb(), email);
  if (!data) return NextResponse.json({ error: "Account not found" }, { status: 404 });

  const filename = `promptinghub-export-${email.replace(/[^a-z0-9]/gi, "-")}.json`;
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
