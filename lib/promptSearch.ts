// Pure, framework-free helpers for in-prompt search (find text across a prompt's
// files). Case-insensitive plain-substring matching — no regex, so user input is
// never a ReDoS / injection vector. Kept here so the matching + highlight-splitting
// logic is unit-testable without a DOM.

export type Segment = { text: string; match: boolean };

// Minimum query length before search activates — avoids highlighting every "a".
export const MIN_QUERY_LEN = 2;

export function normalizeQuery(query: string): string {
  return (query || "").trim();
}

// Count case-insensitive, non-overlapping occurrences of query in text.
export function countMatches(text: string, query: string): number {
  const q = normalizeQuery(query).toLowerCase();
  if (q.length < MIN_QUERY_LEN || !text) return 0;
  const lower = text.toLowerCase();
  let n = 0;
  let i = 0;
  for (;;) {
    const idx = lower.indexOf(q, i);
    if (idx === -1) break;
    n++;
    i = idx + q.length;
  }
  return n;
}

// Split text into alternating non-match / match segments for rendering with <mark>.
// `maxMatches` caps how many matches get their own segment (the remainder is
// returned as one trailing plain segment) so a pathological file with thousands of
// hits can't explode the DOM. Returns a single non-match segment when nothing hits.
export function splitHighlight(text: string, query: string, maxMatches = 1000): Segment[] {
  const q = normalizeQuery(query);
  if (q.length < MIN_QUERY_LEN || !text) return text ? [{ text, match: false }] : [];
  const ql = q.toLowerCase();
  const lower = text.toLowerCase();
  const segs: Segment[] = [];
  let i = 0;
  let hits = 0;
  while (i < text.length && hits < maxMatches) {
    const idx = lower.indexOf(ql, i);
    if (idx === -1) break;
    if (idx > i) segs.push({ text: text.slice(i, idx), match: false });
    segs.push({ text: text.slice(idx, idx + q.length), match: true });
    i = idx + q.length;
    hits++;
  }
  if (i < text.length) segs.push({ text: text.slice(i), match: false });
  return segs.length ? segs : [{ text, match: false }];
}

export type FileLike = { path: string; content: string };
export type FileSearchResult = {
  // path → number of content matches (only files with ≥1 match are present)
  counts: Record<string, number>;
  total: number;
  filesWithMatches: number;
};

// Count matches across every file's CONTENT (not path) so the per-file badge
// matches what gets highlighted in the viewer.
export function searchFiles(files: FileLike[], query: string): FileSearchResult {
  const counts: Record<string, number> = {};
  let total = 0;
  let filesWithMatches = 0;
  if (normalizeQuery(query).length < MIN_QUERY_LEN) return { counts, total, filesWithMatches };
  for (const f of files) {
    const c = countMatches(f.content, query);
    if (c > 0) {
      counts[f.path] = c;
      total += c;
      filesWithMatches++;
    }
  }
  return { counts, total, filesWithMatches };
}
