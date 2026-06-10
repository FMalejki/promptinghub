export type TemplateVar = { name: string; default: string };

// Matches {{ name }} or {{ name:default text }}
const VAR_RE = /\{\{\s*([a-zA-Z0-9_]+)\s*(?::([^}]*))?\}\}/g;

export function extractVariables(text: string): TemplateVar[] {
  const order: string[] = [];
  const defaults = new Map<string, string>();
  for (const m of text.matchAll(VAR_RE)) {
    const name = m[1];
    const def = (m[2] ?? "").trim();
    if (!defaults.has(name)) {
      order.push(name);
      defaults.set(name, def);
    } else if (def && !defaults.get(name)) {
      defaults.set(name, def);
    }
  }
  return order.map((name) => ({ name, default: defaults.get(name) ?? "" }));
}

export function applyVariables(text: string, values: Record<string, string>): string {
  return text.replace(VAR_RE, (_full, name: string, def?: string) => {
    const v = values[name];
    if (v !== undefined && v !== "") return v;
    return (def ?? "").trim();
  });
}

export type TemplateToken =
  | { type: "text"; text: string }
  | { type: "var"; name: string; default: string };

// Split text into literal segments and {{variable}} tokens, preserving order.
// Lets the UI render unfilled variables as highlighted chips instead of blanks.
export function tokenizeTemplate(text: string): TemplateToken[] {
  const out: TemplateToken[] = [];
  const re = new RegExp(VAR_RE.source, "g");
  let last = 0;
  for (const m of text.matchAll(re)) {
    const idx = m.index ?? 0;
    if (idx > last) out.push({ type: "text", text: text.slice(last, idx) });
    out.push({ type: "var", name: m[1], default: (m[2] ?? "").trim() });
    last = idx + m[0].length;
  }
  if (last < text.length) out.push({ type: "text", text: text.slice(last) });
  return out;
}

export function extractVariablesFromFiles(files: { content: string }[]): TemplateVar[] {
  const order: string[] = [];
  const defaults = new Map<string, string>();
  for (const f of files) {
    for (const v of extractVariables(f.content)) {
      if (!defaults.has(v.name)) {
        order.push(v.name);
        defaults.set(v.name, v.default);
      } else if (v.default && !defaults.get(v.name)) {
        defaults.set(v.name, v.default);
      }
    }
  }
  return order.map((name) => ({ name, default: defaults.get(name) ?? "" }));
}
