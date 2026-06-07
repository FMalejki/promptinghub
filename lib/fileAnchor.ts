// Deep-link helpers for individual files within a multi-file prompt. The file
// path travels in the URL hash so links are shareable without server routes.

const PREFIX = "file=";

// "#file=<encoded path>" — the shareable hash for a file.
export function fileAnchorHash(path: string): string {
  return `#${PREFIX}${encodeURIComponent(path)}`;
}

// Append (or replace) the file hash on a base url.
export function fileAnchorLink(baseUrl: string, path: string): string {
  const base = baseUrl.replace(/#.*$/, "");
  return `${base}${fileAnchorHash(path)}`;
}

// Extract the file path from a hash, or null if it isn't a file anchor.
export function parseFileAnchor(hash: string): string | null {
  const h = hash.startsWith("#") ? hash.slice(1) : hash;
  if (!h.startsWith(PREFIX)) return null;
  const encoded = h.slice(PREFIX.length);
  if (!encoded) return null;
  try {
    return decodeURIComponent(encoded);
  } catch {
    return null;
  }
}

// A DOM-id-safe identifier for a file path (deterministic).
export function fileAnchorId(path: string): string {
  return `file-${path.replace(/[^A-Za-z0-9_-]/g, "-")}`;
}
