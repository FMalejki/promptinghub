// Minimal, dependency-free markdown for prompt READMEs. Intentionally small:
// headings, fenced code, bullet lists, paragraphs, and inline bold/italic/code/links.
// Rendering happens in React (text auto-escaped); links are restricted to http(s).

export type InlineSegment =
  | { type: "text"; text: string }
  | { type: "bold"; text: string }
  | { type: "italic"; text: string }
  | { type: "code"; text: string }
  | { type: "link"; text: string; href: string };

export type Block =
  | { type: "heading"; level: number; text: string }
  | { type: "code"; lang: string; text: string }
  | { type: "list"; items: string[] }
  | { type: "paragraph"; text: string };

export function pickReadme(files: { path: string; content: string }[]): string | null {
  const readme = files.find((f) => /(^|\/)readme(\.md)?$/i.test(f.path.trim()));
  if (!readme || !readme.content.trim()) return null;
  return readme.content;
}

// The README shown on a prompt's detail page. Prefer the author's explicit
// `readme` field (first-class, written in the form); fall back to a README.md
// found among the uploaded files. Returns null when neither has content.
export function resolveReadme(
  explicit: string | null | undefined,
  files: { path: string; content: string }[],
): string | null {
  if (explicit && explicit.trim()) return explicit;
  return pickReadme(files);
}

export function parseBlocks(src: string): Block[] {
  const lines = src.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;
  let para: string[] = [];
  let list: string[] = [];

  const flushPara = () => {
    if (para.length) {
      blocks.push({ type: "paragraph", text: para.join(" ").trim() });
      para = [];
    }
  };
  const flushList = () => {
    if (list.length) {
      blocks.push({ type: "list", items: list });
      list = [];
    }
  };

  while (i < lines.length) {
    const line = lines[i];

    // fenced code
    const fence = line.match(/^```\s*(\S*)\s*$/);
    if (fence) {
      flushPara();
      flushList();
      const lang = fence[1] || "";
      const buf: string[] = [];
      i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) buf.push(lines[i++]);
      i++; // skip closing fence
      blocks.push({ type: "code", lang, text: buf.join("\n") });
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      flushPara();
      flushList();
      blocks.push({ type: "heading", level: heading[1].length, text: heading[2].trim() });
      i++;
      continue;
    }

    const bullet = line.match(/^\s*[-*]\s+(.*)$/);
    if (bullet) {
      flushPara();
      list.push(bullet[1].trim());
      i++;
      continue;
    }

    if (line.trim() === "") {
      flushPara();
      flushList();
      i++;
      continue;
    }

    flushList();
    para.push(line.trim());
    i++;
  }
  flushPara();
  flushList();
  return blocks;
}

const INLINE_RE = /(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|(`([^`]+)`)|(\[([^\]]+)\]\(([^)]+)\))/g;

export function parseInline(text: string): InlineSegment[] {
  const out: InlineSegment[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  INLINE_RE.lastIndex = 0;
  while ((m = INLINE_RE.exec(text))) {
    if (m.index > last) out.push({ type: "text", text: text.slice(last, m.index) });
    if (m[2] !== undefined) out.push({ type: "bold", text: m[2] });
    else if (m[4] !== undefined) out.push({ type: "italic", text: m[4] });
    else if (m[6] !== undefined) out.push({ type: "code", text: m[6] });
    else if (m[8] !== undefined) {
      const href = m[9];
      // Only allow http(s) links; otherwise keep the raw text (no clickable href).
      if (/^https?:\/\//i.test(href)) out.push({ type: "link", text: m[8], href });
      else out.push({ type: "text", text: m[0] });
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ type: "text", text: text.slice(last) });
  return out.length ? out : [{ type: "text", text }];
}
