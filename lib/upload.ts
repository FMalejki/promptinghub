// Pure validation for user file uploads (avatars, covers). Kept framework-free so
// the allow-list + size cap are unit-testable and shared by the API route. SVG is
// intentionally excluded — it can carry scripts (stored-XSS via an <img>/<object>).

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

// MIME → file extension for the safe raster image types we accept.
export const IMAGE_MIME_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

export type UploadCheck = { ok: true; ext: string } | { ok: false; error: string };

// Validate a proposed image upload by MIME type and size. Never trusts the
// filename's extension — the content-type decides, and the size cap is hard.
export function validateImageUpload(contentType: string | null | undefined, size: number): UploadCheck {
  const type = (contentType || "").split(";")[0].trim().toLowerCase();
  const ext = IMAGE_MIME_EXT[type];
  if (!ext) {
    return { ok: false, error: "Unsupported image type. Use PNG, JPEG, WebP, or GIF." };
  }
  if (!Number.isFinite(size) || size <= 0) {
    return { ok: false, error: "Empty file." };
  }
  if (size > MAX_IMAGE_BYTES) {
    return { ok: false, error: `Image too large (max ${Math.floor(MAX_IMAGE_BYTES / (1024 * 1024))} MB).` };
  }
  return { ok: true, ext };
}

// Build a collision-resistant, kind-scoped object path for the blob store.
// `rand` is injected so this stays pure/testable (caller passes crypto randomness).
export function uploadObjectPath(kind: "avatar" | "cover", ext: string, rand: string): string {
  const safeKind = kind === "avatar" ? "avatars" : "covers";
  const token = (rand || "x").replace(/[^a-zA-Z0-9]/g, "").slice(0, 24) || "x";
  return `${safeKind}/${token}.${ext}`;
}
