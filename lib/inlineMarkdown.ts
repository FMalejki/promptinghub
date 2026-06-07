// Minimal, safe inline markdown for comment bodies: **bold**, *italic* / _italic_,
// and `code`. Returns typed segments (no dangerouslySetInnerHTML) so a renderer
// can map them to elements. Unmatched/empty markers stay literal. Markdown inside
// a code span is not parsed.

export type InlinePart =
  | { type: "text"; text: string }
  | { type: "bold"; text: string }
  | { type: "italic"; text: string }
  | { type: "code"; text: string };

export function parseInline(input: string): InlinePart[] {
  const parts: InlinePart[] = [];
  let buf = "";
  let i = 0;
  const flush = () => {
    if (buf) parts.push({ type: "text", text: buf });
    buf = "";
  };

  while (i < input.length) {
    const rest = input.slice(i);

    // `code` — closing backtick, non-empty, no inner parsing.
    if (rest[0] === "`") {
      const end = rest.indexOf("`", 1);
      if (end > 1) {
        flush();
        parts.push({ type: "code", text: rest.slice(1, end) });
        i += end + 1;
        continue;
      }
    }

    // **bold** — checked before single-star italic.
    if (rest.startsWith("**")) {
      const end = rest.indexOf("**", 2);
      if (end > 2) {
        flush();
        parts.push({ type: "bold", text: rest.slice(2, end) });
        i += end + 2;
        continue;
      }
    }

    // *italic* or _italic_
    const m = rest[0];
    if (m === "*" || m === "_") {
      const end = rest.indexOf(m, 1);
      if (end > 1) {
        flush();
        parts.push({ type: "italic", text: rest.slice(1, end) });
        i += end + 1;
        continue;
      }
    }

    buf += input[i];
    i += 1;
  }

  flush();
  return parts;
}
