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

// Vercel server uploads (file goes through our function, then to Blob) are
// capped at 4.5 MB. Enforce it so a too-big file fails fast with a clear error
// instead of a confusing platform 413 mid-stream.
export const MAX_FILE_BYTES = 4.5 * 1024 * 1024; // 4.5 MB

// Allow-list of binary attachment types an LLM might actually consume: docs,
// data, common media. EXECUTABLES/SCRIPTS ARE INTENTIONALLY ABSENT — this is an
// allow-list, so anything not here (e.g. .exe, .sh, .bat, .js, .html, .svg) is
// rejected. SVG is excluded for the same stored-XSS reason as images.
export const FILE_MIME_EXT: Record<string, string> = {
  // raster images (same safe set as avatars/covers)
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  // documents & data
  "application/pdf": "pdf",
  "text/plain": "txt",
  "text/markdown": "md",
  "text/csv": "csv",
  "text/tab-separated-values": "tsv",
  "application/json": "json",
  "text/yaml": "yaml",
  "application/x-yaml": "yaml",
  "application/zip": "zip",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  // media (LLMs accept audio/video too)
  "audio/mpeg": "mp3",
  "audio/wav": "wav",
  "video/mp4": "mp4",
  "video/webm": "webm",
};

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

// Validate a binary attachment upload by MIME type and size. Allow-list only —
// executables/scripts/SVG are rejected by omission. Size cap is the Vercel
// 4.5 MB server-upload limit. The filename's extension is never trusted.
export function validateFileUpload(contentType: string | null | undefined, size: number): UploadCheck {
  const type = (contentType || "").split(";")[0].trim().toLowerCase();
  const ext = FILE_MIME_EXT[type];
  if (!ext) {
    return { ok: false, error: "Unsupported file type. Allowed: images, PDF, text/markdown/CSV/JSON/YAML, Office docs, zip, mp3/wav, mp4/webm." };
  }
  if (!Number.isFinite(size) || size <= 0) {
    return { ok: false, error: "Empty file." };
  }
  if (size > MAX_FILE_BYTES) {
    return { ok: false, error: `File too large (max ${Math.round(MAX_FILE_BYTES / (1024 * 1024) * 10) / 10} MB).` };
  }
  return { ok: true, ext };
}

// Object path for an uploaded attachment, scoped under attachments/.
export function uploadFilePath(ext: string, rand: string): string {
  const token = (rand || "x").replace(/[^a-zA-Z0-9]/g, "").slice(0, 24) || "x";
  const safeExt = (ext || "bin").replace(/[^a-z0-9]/gi, "").slice(0, 8) || "bin";
  return `attachments/${token}.${safeExt}`;
}

// Resolve the Vercel Blob read-write token from env. When MULTIPLE blob stores
// are connected to a Vercel project, the env vars get a per-store prefix — so a
// Public store can surface as BLOB_PUBLIC_READ_WRITE_TOKEN rather than the
// default BLOB_READ_WRITE_TOKEN. Prefer the *public* store's token (public
// avatars/covers need public blobs), then fall back to the unprefixed name.
// Returns "" when uploads aren't configured. `env` is injected for testability.
export function resolveBlobToken(env: Record<string, string | undefined> = process.env): string {
  return env.BLOB_PUBLIC_READ_WRITE_TOKEN || env.BLOB_READ_WRITE_TOKEN || "";
}
