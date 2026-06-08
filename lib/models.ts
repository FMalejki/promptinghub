// Model catalogue. The hardcoded AI_MODELS in constants.ts is the offline-safe
// fallback (and keeps our stable id scheme so getModelName / image-model
// recognition keep working). To avoid the list going stale, fetchModels() pulls
// the live catalogue from OpenRouter's public endpoint and merges anything new on
// top of the curated set. Any failure silently degrades to curated-only.
import { AI_MODELS } from "./constants";

export type ModelOption = { id: string; name: string; provider: string };

const OPENROUTER_URL = "https://openrouter.ai/api/v1/models";

// Pretty provider name from an OpenRouter id prefix (e.g. "x-ai" → "xAI").
const PROVIDER_NAMES: Record<string, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  google: "Google",
  "meta-llama": "Meta",
  meta: "Meta",
  mistralai: "Mistral AI",
  "x-ai": "xAI",
  deepseek: "DeepSeek",
  qwen: "Qwen",
  cohere: "Cohere",
  perplexity: "Perplexity",
  microsoft: "Microsoft",
  nvidia: "NVIDIA",
};

function prettyProvider(prefix: string): string {
  if (PROVIDER_NAMES[prefix]) return PROVIDER_NAMES[prefix];
  return prefix
    .split(/[-_]/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

// Pure: convert OpenRouter's { data: [...] } payload into ModelOption[].
// Drops entries without an id; strips the "Vendor: " prefix from the display name.
export function normalizeOpenRouterModels(raw: unknown): ModelOption[] {
  const data = (raw as any)?.data;
  if (!Array.isArray(data)) return [];
  const out: ModelOption[] = [];
  for (const m of data) {
    const id = typeof m?.id === "string" ? m.id.trim() : "";
    if (!id) continue;
    const rawName = typeof m?.name === "string" ? m.name.trim() : "";
    // "Anthropic: Claude 4 Sonnet" → "Claude 4 Sonnet"
    const name = rawName ? rawName.split(": ").slice(-1)[0].trim() || rawName : id;
    const prefix = id.includes("/") ? id.split("/")[0] : "";
    const provider = prefix ? prettyProvider(prefix) : "Other";
    out.push({ id, name, provider });
  }
  return out;
}

// Curated entries stay first (stable ids the rest of the app understands); live
// entries that aren't already represented (by id OR display name) are appended.
// A trailing "other" curated entry is kept last.
export function mergeModels(curated: ModelOption[], live: ModelOption[]): ModelOption[] {
  const tail = curated.filter((m) => m.id === "other");
  const head = curated.filter((m) => m.id !== "other");
  const seenIds = new Set(curated.map((m) => m.id));
  const seenNames = new Set(curated.map((m) => m.name.toLowerCase()));
  const extra: ModelOption[] = [];
  for (const m of live) {
    if (seenIds.has(m.id) || seenNames.has(m.name.toLowerCase())) continue;
    seenIds.add(m.id);
    seenNames.add(m.name.toLowerCase());
    extra.push(m);
  }
  return [...head, ...extra, ...tail];
}

const CURATED: ModelOption[] = AI_MODELS.map((m) => ({ id: m.id, name: m.name, provider: m.provider }));

// Server-side: live catalogue merged over curated, cached for a day. Falls back
// to curated-only on any network/parse error so the picker never breaks.
export async function fetchModels(): Promise<ModelOption[]> {
  try {
    const res = await fetch(OPENROUTER_URL, {
      headers: { accept: "application/json" },
      // Next.js data cache: refresh at most once per day.
      next: { revalidate: 86400 },
    } as RequestInit);
    if (!res.ok) return CURATED;
    const live = normalizeOpenRouterModels(await res.json());
    if (live.length === 0) return CURATED;
    return mergeModels(CURATED, live);
  } catch {
    return CURATED;
  }
}
