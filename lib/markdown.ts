// Minimal, dependency-free markdown for prompt READMEs. Intentionally small:
// headings, fenced code, bullet lists, paragraphs, and inline bold/italic/code/links.
// Rendering happens in React (text auto-escaped); links are restricted to http(s).

export type InlineSegment =
  | { type: "text"; text: string }
  | { type: "bold"; text: string }
  | { type: "italic"; text: string }
  | { type: "code"; text: string }
  | { type: "link"; text: string; href: string };

export type TableAlign = "left" | "center" | "right" | null;

export type Block =
  | { type: "heading"; level: number; text: string }
  | { type: "code"; lang: string; text: string }
  | { type: "list"; items: string[]; ordered?: boolean }
  | { type: "quote"; text: string }
  | { type: "image"; alt: string; src: string }
  | { type: "hr" }
  | { type: "table"; header: string[]; align: TableAlign[]; rows: string[][] }
  | { type: "paragraph"; text: string };

// Split a GFM table row into trimmed cells, dropping optional outer pipes and
// honoring backslash-escaped pipes (\|) inside a cell.
function splitTableRow(line: string): string[] {
  let s = line.trim();
  if (s.startsWith("|")) s = s.slice(1);
  if (s.endsWith("|") && !s.endsWith("\\|")) s = s.slice(0, -1);
  return s.split(/(?<!\\)\|/).map((c) => c.replace(/\\\|/g, "|").trim());
}

// A GFM delimiter row: each cell is dashes with optional leading/trailing colons
// (e.g. ---, :--, --:, :-:). Must have at least one cell.
function isTableDelimiter(line: string): boolean {
  if (!line.includes("-")) return false;
  const cells = splitTableRow(line);
  return cells.length > 0 && cells.every((c) => /^:?-+:?$/.test(c));
}

function alignOfCell(cell: string): TableAlign {
  const c = cell.trim();
  const left = c.startsWith(":");
  const right = c.endsWith(":");
  if (left && right) return "center";
  if (right) return "right";
  if (left) return "left";
  return null;
}

export function pickReadme(files: { path: string; content: string }[]): string | null {
  // Prefer the ROOT readme over a nested one (e.g. don't pick phases/README.md when
  // a top-level README.md exists). Rank by directory depth, then by shorter path.
  const readmes = files
    .filter((f) => /(^|\/)readme(\.md)?$/i.test((f.path || "").trim()) && f.content.trim())
    .sort((a, b) => {
      const da = (a.path.match(/\//g) || []).length;
      const db = (b.path.match(/\//g) || []).length;
      if (da !== db) return da - db;
      return a.path.length - b.path.length;
    });
  return readmes.length ? readmes[0].content : null;
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
  let listOrdered = false;
  let quote: string[] = [];

  const flushPara = () => {
    if (para.length) {
      blocks.push({ type: "paragraph", text: para.join(" ").trim() });
      para = [];
    }
  };
  const flushList = () => {
    if (list.length) {
      blocks.push(listOrdered ? { type: "list", items: list, ordered: true } : { type: "list", items: list });
      list = [];
      listOrdered = false;
    }
  };
  const flushQuote = () => {
    if (quote.length) {
      blocks.push({ type: "quote", text: quote.join(" ").trim() });
      quote = [];
    }
  };

  while (i < lines.length) {
    const line = lines[i];

    // fenced code
    const fence = line.match(/^```\s*(\S*)\s*$/);
    if (fence) {
      flushPara();
      flushList();
      flushQuote();
      const lang = fence[1] || "";
      const buf: string[] = [];
      i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) buf.push(lines[i++]);
      i++; // skip closing fence
      blocks.push({ type: "code", lang, text: buf.join("\n") });
      continue;
    }

    // GFM pipe table: a header row followed by a |---|:--:|--- delimiter row.
    // Cells are truncated/padded to the header's column count (GFM semantics);
    // the table ends at a blank line or a line with no pipe.
    if (line.includes("|") && i + 1 < lines.length && isTableDelimiter(lines[i + 1])) {
      flushPara();
      flushList();
      flushQuote();
      const header = splitTableRow(line);
      const delim = splitTableRow(lines[i + 1]);
      const align: TableAlign[] = header.map((_, c) => alignOfCell(delim[c] ?? ""));
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim() !== "" && lines[i].includes("|")) {
        const cells = splitTableRow(lines[i]);
        rows.push(header.map((_, c) => cells[c] ?? ""));
        i++;
      }
      blocks.push({ type: "table", header, align, rows });
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      flushPara();
      flushList();
      flushQuote();
      blocks.push({ type: "heading", level: heading[1].length, text: heading[2].trim() });
      i++;
      continue;
    }

    // Horizontal rule (---, ***, ___) — a line of 3+ of the same marker.
    if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) {
      flushPara();
      flushList();
      flushQuote();
      blocks.push({ type: "hr" });
      i++;
      continue;
    }

    // Standalone image line: ![alt](http(s)://…)
    const img = line.trim().match(/^!\[([^\]]*)\]\((https?:\/\/[^)]+)\)$/);
    if (img) {
      flushPara();
      flushList();
      flushQuote();
      blocks.push({ type: "image", alt: img[1].trim(), src: img[2] });
      i++;
      continue;
    }

    // Blockquote: one or more "> " lines collapsed into a single quote block.
    const quoteLine = line.match(/^\s*>\s?(.*)$/);
    if (quoteLine) {
      flushPara();
      flushList();
      quote.push(quoteLine[1].trim());
      i++;
      continue;
    }

    const ordered = line.match(/^\s*\d+[.)]\s+(.*)$/);
    if (ordered) {
      flushPara();
      flushQuote();
      if (list.length && !listOrdered) flushList();
      listOrdered = true;
      list.push(ordered[1].trim());
      i++;
      continue;
    }

    const bullet = line.match(/^\s*[-*]\s+(.*)$/);
    if (bullet) {
      flushPara();
      flushQuote();
      if (list.length && listOrdered) flushList();
      list.push(bullet[1].trim());
      i++;
      continue;
    }

    if (line.trim() === "") {
      flushPara();
      flushList();
      flushQuote();
      i++;
      continue;
    }

    flushList();
    flushQuote();
    para.push(line.trim());
    i++;
  }
  flushPara();
  flushList();
  flushQuote();
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
