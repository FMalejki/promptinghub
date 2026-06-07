import type { TestedModel } from "./prompts";

/**
 * A draft parsed from external content (pasted text, a tweet, a gist…).
 * It is intentionally NOT a finished prompt — a human reviews/edits it before publishing.
 */
export type ImportedDraft = {
  name: string;
  description: string;
  category: string;
  body: string;
  testedModels?: TestedModel[];
  source: string;
};

const NAME_KEYS = new Set(["name", "title"]);
const DESC_KEYS = new Set(["description", "desc"]);
const CAT_KEYS = new Set(["category", "cat"]);
const MODEL_KEYS = new Set(["models", "model"]);

function firstLine(body: string): string {
  const line = body.split("\n").map((l) => l.trim()).find((l) => l.length) || "";
  return line.replace(/^#+\s*/, "").trim(); // strip a leading markdown heading
}

function truncate(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max - 1).trimEnd() + "…";
}

/**
 * Parse pasted/imported text into a prompt draft.
 *
 * Supports an optional `---` frontmatter block (name/title, description/desc,
 * category/cat, models/model) followed by the prompt body. Without frontmatter,
 * the name and description are derived from the first meaningful line.
 *
 * Returns null for empty input. `source` labels where the content came from
 * (e.g. "paste", "twitter") for attribution/auditing — it does not publish.
 */
export function parsePastedPrompt(raw: string, source = "paste"): ImportedDraft | null {
  if (!raw || !raw.trim()) return null;

  let fm: Record<string, string> = {};
  let body = raw.trim();

  const fmMatch = body.match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/);
  if (fmMatch) {
    const [, block, rest] = fmMatch;
    for (const line of block.split("\n")) {
      const idx = line.indexOf(":");
      if (idx === -1) continue;
      const key = line.slice(0, idx).trim().toLowerCase();
      const val = line.slice(idx + 1).trim();
      if (val) fm[key] = val;
    }
    body = rest.trim();
  }

  const fmGet = (keys: Set<string>): string | undefined => {
    for (const [k, v] of Object.entries(fm)) if (keys.has(k)) return v;
    return undefined;
  };

  const derived = firstLine(body);
  const name = truncate(fmGet(NAME_KEYS) || derived || "Untitled prompt", 100);
  const description = truncate(fmGet(DESC_KEYS) || derived || name, 300);
  const category = fmGet(CAT_KEYS) || "Other";

  const modelsRaw = fmGet(MODEL_KEYS);
  const testedModels = modelsRaw
    ? modelsRaw
        .split(",")
        .map((m) => m.trim())
        .filter(Boolean)
        .map((modelId) => ({ modelId }))
    : undefined;

  return { name, description, category, body, testedModels, source };
}
