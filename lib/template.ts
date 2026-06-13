export type TemplateVar = { name: string; default: string };

// Matches {{ name }} or {{ name:default text }}
const VAR_RE = /\{\{\s*([a-zA-Z0-9_]+)\s*(?::([^}]*))?\}\}/g;

// Above this many distinct variables, a prompt is almost certainly using {{ }}
// as its OWN templating syntax (Handlebars/Jinja docs, code generators) rather
// than offering a short fill-in form. We then show no Customize panel and render
// the body verbatim — a 87-field form helps nobody.
export const MAX_CUSTOMIZE_VARS = 12;

// {{else}}, {{this}} etc. look like variables but are Handlebars/templating
// control tokens, never user-fillable fields. ({{#if}} / {{/each}} already fail
// the [a-zA-Z0-9_] match, so only the bare keywords need excluding.)
const CONTROL_WORDS = new Set([
  "else", "this", "if", "unless", "each", "with", "end", "endif", "endfor", "endwith", "endunless",
]);

function isFillable(name: string): boolean {
  return !CONTROL_WORDS.has(name.toLowerCase());
}

// Remove fenced + inline code so {{tokens}} that are only ever code EXAMPLES
// don't get surfaced as fill-in fields. Used for extraction only, never rendering.
function stripCode(text: string): string {
  return (text || "").replace(/```[\s\S]*?```/g, " ").replace(/`[^`]*`/g, " ");
}

export function extractVariables(text: string): TemplateVar[] {
  const order: string[] = [];
  const defaults = new Map<string, string>();
  for (const m of text.matchAll(VAR_RE)) {
    const name = m[1];
    if (!isFillable(name)) continue;
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

// Variables to offer in the Customize panel: deduped across files, control words
// and code-example tokens excluded, and capped — beyond MAX_CUSTOMIZE_VARS the
// prompt is treated as a templating doc (returns []) so it renders verbatim.
export function extractVariablesFromFiles(files: { content: string }[]): TemplateVar[] {
  const order: string[] = [];
  const defaults = new Map<string, string>();
  for (const f of files) {
    for (const v of extractVariables(stripCode(f.content))) {
      if (!defaults.has(v.name)) {
        order.push(v.name);
        defaults.set(v.name, v.default);
      } else if (v.default && !defaults.get(v.name)) {
        defaults.set(v.name, v.default);
      }
    }
  }
  if (order.length > MAX_CUSTOMIZE_VARS) return [];
  return order.map((name) => ({ name, default: defaults.get(name) ?? "" }));
}
