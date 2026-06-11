import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { put } from "@vercel/blob";
import { authOptions } from "@/lib/auth";
import { validateImageUpload, uploadObjectPath, resolveBlobToken } from "@/lib/upload";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Image upload for avatars + covers. Env-gated on the Vercel Blob read-write
// token (resolveBlobToken handles the per-store prefix when multiple stores are
// connected) so it degrades cleanly to URL-only when storage isn't configured.
// Auth required — never an open upload proxy. Returns { url } (public blob URL).
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const token = resolveBlobToken();
  if (!token) {
    return NextResponse.json(
      { error: "Uploads aren’t enabled on this instance. Paste an image URL instead.", configured: false },
      { status: 503 },
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart form data." }, { status: 400 });
  }

  const file = form.get("file");
  const kind = form.get("kind") === "avatar" ? "avatar" : "cover";
  if (!(file instanceof Blob)) return NextResponse.json({ error: "No file provided." }, { status: 400 });

  const check = validateImageUpload(file.type, file.size);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: 415 });

  const rand = (globalThis.crypto?.randomUUID?.() || `${session.user.email}-${file.size}`).replace(/-/g, "");
  const path = uploadObjectPath(kind, check.ext, rand);

  try {
    const { url } = await put(path, file, {
      access: "public",
      contentType: file.type,
      addRandomSuffix: true,
      token,
    });
    return NextResponse.json({ url });
  } catch {
    return NextResponse.json({ error: "Upload failed. Try again or paste a URL." }, { status: 502 });
  }
}

// Capability probe for the UI: is upload enabled?
export async function GET() {
  return NextResponse.json({ configured: !!resolveBlobToken() });
}
