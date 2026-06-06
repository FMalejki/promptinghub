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
