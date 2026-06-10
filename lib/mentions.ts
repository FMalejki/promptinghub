// Extract @handle mentions from a comment body. Handles are lowercased, deduped,
// and capped so a single comment can't fan out an unbounded number of notifications.
// An @ preceded by a word char (e.g. inside an email like bob@example.com) is ignored.

const MENTION_RE = /(?:^|[^a-zA-Z0-9_])@([a-z0-9_-]+)/gi;
const MAX_MENTIONS = 10;

export function extractMentions(body: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const m of body.matchAll(MENTION_RE)) {
    const handle = m[1].toLowerCase();
    if (seen.has(handle)) continue;
    seen.add(handle);
    out.push(handle);
    if (out.length >= MAX_MENTIONS) break;
  }
  return out;
}

// Split the @handles in a draft into those that resolve to a real user
// (`confirmed` — they'll actually be notified) and those that don't (`unknown`
// — likely a typo or a not-yet-registered handle). `knownHandles` is whatever
// the resolve endpoint reported as existing. Order follows first appearance in
// the body; both lists are lowercased + deduped (via extractMentions).
export function classifyMentions(
  body: string,
  knownHandles: string[],
): { confirmed: string[]; unknown: string[] } {
  const known = new Set(knownHandles.map((h) => h.toLowerCase()));
  const confirmed: string[] = [];
  const unknown: string[] = [];
  for (const h of extractMentions(body)) {
    (known.has(h) ? confirmed : unknown).push(h);
  }
  return { confirmed, unknown };
}

export type MentionPart = { type: "text"; text: string } | { type: "mention"; handle: string };

// Split a body into text + mention segments so a renderer can linkify @handles
// without using dangerouslySetInnerHTML. Concatenating the segment text/handles
// reproduces the original string (mentions keep their original casing).
export function renderMentions(body: string): MentionPart[] {
  const parts: MentionPart[] = [];
  let last = 0;
  for (const m of body.matchAll(MENTION_RE)) {
    const handle = m[1];
    // The @ sits after an optional leading boundary char captured in m[0].
    const at = m.index! + m[0].length - handle.length - 1;
    if (at > last) parts.push({ type: "text", text: body.slice(last, at) });
    parts.push({ type: "mention", handle });
    last = at + handle.length + 1;
  }
  if (last < body.length) parts.push({ type: "text", text: body.slice(last) });
  return parts;
}
