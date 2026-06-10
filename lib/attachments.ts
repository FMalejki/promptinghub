// Prompt attachments: external files (images, video, audio, PDFs, docs) that an
// LLM can look at alongside the prompt. MVP is attach-by-URL — there's no blob
// storage yet (cover images are URL-only too), so binary upload is a follow-up.

import { isLikelyImageUrl } from "./imageUrl";

export type AttachmentKind = "image" | "video" | "audio" | "pdf" | "doc" | "other";

export type Attachment = { url: string; name?: string };

const EXT = {
  image: /\.(png|jpe?g|gif|webp|avif|svg|bmp|heic|heif)$/i,
  video: /\.(mp4|webm|mov|m4v|avi|mkv|ogv)$/i,
  audio: /\.(mp3|wav|ogg|oga|m4a|flac|aac)$/i,
  pdf: /\.pdf$/i,
  doc: /\.(txt|md|markdown|csv|tsv|json|ya?ml|docx?|rtf)$/i,
};

const MAX_ATTACHMENTS = 20;
const MAX_URL = 2000;
const MAX_NAME = 200;

// Classify an attachment by its URL (or filename). Falls back to "other" when
// nothing matches. Extensionless image CDNs are caught via isLikelyImageUrl.
export function attachmentKind(urlOrName: string): AttachmentKind {
  const s = (urlOrName || "").trim();
  if (!s) return "other";
  if (s.startsWith("data:image/")) return "image";
  if (s.startsWith("data:video/")) return "video";
  if (s.startsWith("data:audio/")) return "audio";
  // Compare against the path only, ignoring query strings / fragments.
  let path = s;
  try {
    path = new URL(s).pathname;
  } catch {
    path = s.split(/[?#]/)[0];
  }
  if (EXT.image.test(path)) return "image";
  if (EXT.video.test(path)) return "video";
  if (EXT.audio.test(path)) return "audio";
  if (EXT.pdf.test(path)) return "pdf";
  if (EXT.doc.test(path)) return "doc";
  if (isLikelyImageUrl(s)) return "image";
  return "other";
}

function isAllowedUrl(s: string): boolean {
  if (s.startsWith("data:")) return s.length <= MAX_URL;
  try {
    const u = new URL(s);
    return (u.protocol === "http:" || u.protocol === "https:") && s.length <= MAX_URL;
  } catch {
    return false;
  }
}

// Clean a list of attachments: trim, keep only http(s)/data URLs, cap name
// length, drop blanks/dupes, and cap the total count. Accepts loosely-typed
// input (e.g. straight from the request body) and never throws.
export function normalizeAttachments(input: unknown): Attachment[] {
  if (!Array.isArray(input)) return [];
  const out: Attachment[] = [];
  const seen = new Set<string>();
  for (const raw of input) {
    if (!raw || typeof raw !== "object") continue;
    const url = String((raw as { url?: unknown }).url ?? "").trim();
    if (!url || !isAllowedUrl(url) || seen.has(url)) continue;
    seen.add(url);
    const nameRaw = (raw as { name?: unknown }).name;
    const name = typeof nameRaw === "string" ? nameRaw.trim().slice(0, MAX_NAME) : "";
    out.push(name ? { url, name } : { url });
    if (out.length >= MAX_ATTACHMENTS) break;
  }
  return out;
}

// A human label for an attachment: its name, else the URL's basename, else host.
export function attachmentLabel(a: Attachment): string {
  if (a.name) return a.name;
  try {
    const u = new URL(a.url);
    const base = u.pathname.split("/").filter(Boolean).pop();
    return base || u.hostname;
  } catch {
    return a.url.slice(0, 60);
  }
}
