// AI-assisted import: turn pasted prompt text into clean form metadata (title,
// description, category, tags, isSkill) using a configured LLM — preferring FREE
// providers (Gemini / Groq) since this is a cheap extraction task. Everything here
// is pure + unit-testable; the network call lives in the route. When NO provider
// key is set the route falls back to the deterministic heuristic in ./import, so
// the feature ships working today and simply gets better with a free key.

import { PROMPT_CATEGORIES } from "./constants";
import { parsePastedPrompt, type ImportedDraft } from "./import";

export type AiImportProvider = "gemini" | "groq" | "openai" | "anthropic";
export type AiImportChoice = { provider: AiImportProvider; model: string; free: boolean };

// Cap how much pasted text we send to the model (chars) — bounds cost/latency.
export const AI_IMPORT_MAX_INPUT = 16000;

type Env = Record<string, string | undefined>;
function has(v: string | undefined): boolean {
  return !!v && v.trim().length > 0;
}

/**
 * Choose the provider from configured keys, preferring FREE tiers (Gemini, then
 * Groq) for this cheap task before paid keys (OpenAI, Anthropic). `IMPORT_AI_MODEL`
 * overrides the model. Returns null when nothing is configured.
 */
export function aiImportProvider(env: Env): AiImportChoice | null {
  const override = env.IMPORT_AI_MODEL?.trim() || "";
  if (has(env.GEMINI_API_KEY) || has(env.GOOGLE_API_KEY))
    return { provider: "gemini", model: override || "gemini-2.0-flash", free: true };
  if (has(env.GROQ_API_KEY)) return { provider: "groq", model: override || "llama-3.3-70b-versatile", free: true };
  if (has(env.OPENAI_API_KEY)) return { provider: "openai", model: override || "gpt-4o-mini", free: false };
  if (has(env.ANTHROPIC_API_KEY)) return { provider: "anthropic", model: override || "claude-3-5-haiku-latest", free: false };
  return null;
}

export function aiImportAvailable(env: Env): boolean {
  return aiImportProvider(env) !== null;
}

/**
 * The provider-agnostic instruction we send as the user message. Asks for ONLY a
 * JSON object so any model (even without a JSON mode) returns parseable output.
 */
export function buildExtractionInstruction(text: string, categories: readonly string[]): string {
  const clipped = (text || "").slice(0, AI_IMPORT_MAX_INPUT);
  return [
    "You extract structured metadata from a pasted AI prompt or agent skill so a human can review it before publishing.",
    "Return ONLY a single JSON object — no prose, no markdown, no code fences — with EXACTLY these keys:",
    '{ "name": string, "description": string, "category": string, "tags": string[], "isSkill": boolean }',
    "",
    "Rules:",
    "- name: a concise human-readable title (max 80 chars). NOT the whole prompt.",
    "- description: one sentence describing what the prompt does (max 200 chars).",
    `- category: pick the SINGLE best fit, copied EXACTLY from this list: ${categories.join(", ")}.`,
    "- tags: 3 to 6 short, lowercase, topical tags (single words or hyphenated; no '#').",
    "- isSkill: true ONLY if this is an agent skill (e.g. a SKILL.md with name/description), otherwise false.",
    "",
    "PROMPT TEXT:",
    clipped,
  ].join("\n");
}

/**
 * Pull the first JSON object out of a model response, tolerating ```json fences
 * and surrounding prose. Returns null if no valid object is found.
 */
export function extractFirstJsonObject(s: string): any | null {
  if (!s || typeof s !== "string") return null;
  let t = s.trim();
  t = t.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return null;
  try {
    return JSON.parse(t.slice(start, end + 1));
  } catch {
    return null;
  }
}

// Canonicalize a category against the allowed set (case-insensitive, with a loose
// prefix match so "code" → "Coding"). Null when there's no reasonable match.
function canonCategory(input: unknown, categories: readonly string[]): string | null {
  if (typeof input !== "string") return null;
  const want = input.trim().toLowerCase();
  if (!want) return null;
  for (const c of categories) if (c.toLowerCase() === want) return c;
  for (const c of categories) {
    const lc = c.toLowerCase();
    if (lc.startsWith(want) || want.startsWith(lc)) return c;
  }
  return null;
}

function cleanTags(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of input) {
    if (typeof raw !== "string") continue;
    const t = raw.trim().toLowerCase().replace(/^#+/, "").replace(/\s+/g, " ").slice(0, 30).trim();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
    if (out.length >= 10) break;
  }
  return out;
}

function truncate(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max - 1).trimEnd() + "…";
}

export type AiImportedDraft = ImportedDraft & { tags?: string[] };

/**
 * Overlay validated AI metadata on top of the deterministic heuristic draft. The
 * BODY always comes from the heuristic — we never let the model rewrite the user's
 * actual prompt. Any invalid or missing AI field falls back to the heuristic value,
 * so a partial/garbage AI payload can only ever improve on the heuristic, never
 * corrupt it. Returns null for empty input.
 */
export function mergeAiDraft(
  raw: string,
  aiJson: unknown,
  source = "paste",
  categories: readonly string[] = PROMPT_CATEGORIES,
): AiImportedDraft | null {
  const base = parsePastedPrompt(raw, source);
  if (!base) return null;
  const j = (aiJson && typeof aiJson === "object" ? aiJson : {}) as Record<string, unknown>;

  const name = typeof j.name === "string" && j.name.trim() ? truncate(j.name.trim(), 100) : base.name;
  const description =
    typeof j.description === "string" && j.description.trim() ? truncate(j.description.trim(), 300) : base.description;
  const category = canonCategory(j.category, categories) || base.category;
  const tags = cleanTags(j.tags);
  const isSkill = typeof j.isSkill === "boolean" ? j.isSkill || !!base.isSkill : !!base.isSkill;

  return {
    ...base,
    name,
    description,
    category,
    ...(tags.length ? { tags } : {}),
    ...(isSkill ? { isSkill: true } : {}),
  };
}
