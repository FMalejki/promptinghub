// Predefiniowane kategorie/tagi dla promptów
export const PROMPT_CATEGORIES = [
  "Writing",
  "Coding",
  "Marketing",
  "Productivity",
  "Learning",
  "Data Analysis",
  "Creative",
  "Business",
  "Education",
  "Research",
  "Translation",
  "Summarization",
  "Code Review",
  "Debugging",
  "Social Media",
  "SEO",
  "Email",
  "Content Creation",
  "Brainstorming",
  "Fun",
  "Image Generation",
] as const;

export type PromptCategory = typeof PROMPT_CATEGORIES[number];

// Curated, current model catalogue — the offline-safe fallback. The live list is
// pulled from OpenRouter at runtime and merged on top (see lib/models.ts +
// /api/models); this stays in our stable id scheme so getModelName and
// image-model recognition keep working even when the network list is unavailable.
// Keep this trimmed to widely-used current models; the long tail comes from live.
export const AI_MODELS = [
  // OpenAI
  { id: "gpt-4o", name: "GPT-4o", provider: "OpenAI" },
  { id: "gpt-4o-mini", name: "GPT-4o mini", provider: "OpenAI" },
  { id: "gpt-4.1", name: "GPT-4.1", provider: "OpenAI" },
  { id: "o1", name: "o1", provider: "OpenAI" },
  { id: "o3-mini", name: "o3-mini", provider: "OpenAI" },
  { id: "gpt-4-turbo", name: "GPT-4 Turbo", provider: "OpenAI" },
  // Anthropic
  { id: "claude-3.7-sonnet", name: "Claude 3.7 Sonnet", provider: "Anthropic" },
  { id: "claude-3.5-sonnet", name: "Claude 3.5 Sonnet", provider: "Anthropic" },
  { id: "claude-3.5-haiku", name: "Claude 3.5 Haiku", provider: "Anthropic" },
  { id: "claude-3-opus", name: "Claude 3 Opus", provider: "Anthropic" },
  // Google
  { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", provider: "Google" },
  { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash", provider: "Google" },
  { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro", provider: "Google" },
  // Meta
  { id: "llama-3.3-70b", name: "Llama 3.3 70B", provider: "Meta" },
  { id: "llama-3.1-405b", name: "Llama 3.1 405B", provider: "Meta" },
  // Mistral / xAI / DeepSeek / Qwen
  { id: "mistral-large", name: "Mistral Large", provider: "Mistral AI" },
  { id: "grok-3", name: "Grok 3", provider: "xAI" },
  { id: "grok-2", name: "Grok 2", provider: "xAI" },
  { id: "deepseek-r1", name: "DeepSeek R1", provider: "DeepSeek" },
  { id: "deepseek-v3", name: "DeepSeek V3", provider: "DeepSeek" },
  { id: "qwen-2.5-72b", name: "Qwen 2.5 72B", provider: "Qwen" },
  // Image generation
  { id: "gpt-image-1", name: "GPT Image 1", provider: "OpenAI" },
  { id: "dall-e-3", name: "DALL-E 3", provider: "OpenAI" },
  { id: "midjourney", name: "Midjourney", provider: "Midjourney" },
  { id: "stable-diffusion", name: "Stable Diffusion", provider: "Stability AI" },
  { id: "flux", name: "FLUX", provider: "Black Forest Labs" },
  { id: "other", name: "Other", provider: "Custom" },
] as const;

export type AIModel = typeof AI_MODELS[number];

export type TestedModel = {
  modelId: string;
  version?: string;
  notes?: string;
};

// Deterministic, self-contained placeholder for prompts without their own image.
// Previously these were external Unsplash URLs — but those 404'd / got blocked,
// and the <img onError> fallback pointed at *another* Unsplash URL, so a broken
// card stayed broken. An inline SVG data URI can never fail to load.
function hashSeed(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return h;
}

export function getPlaceholderImage(seed: string): string {
  const h = hashSeed(seed);
  const hue = h % 360;
  const hue2 = (hue + 25) % 360;
  // A muted diagonal gradient with a simple "lines of text" glyph — reads as a
  // text/prompt document, not decoration. 4:3 to match the cards.
  const c = "rgba(255,255,255,0.55)";
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0%" stop-color="hsl(${hue},45%,55%)"/>` +
    `<stop offset="100%" stop-color="hsl(${hue2},42%,42%)"/>` +
    `</linearGradient></defs>` +
    `<rect width="400" height="300" fill="url(#g)"/>` +
    `<g fill="${c}">` +
    `<rect x="140" y="120" width="120" height="13" rx="6.5"/>` +
    `<rect x="140" y="146" width="84" height="13" rx="6.5"/>` +
    `<rect x="140" y="172" width="104" height="13" rx="6.5"/>` +
    `</g></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

// Resolve a prompt's banner image, falling back to a deterministic placeholder.
export function promptImageSrc(image: string | null | undefined, seed: string): string {
  return image && image.trim() ? image : getPlaceholderImage(seed);
}

export function getModelName(modelId: string): string {
  const model = AI_MODELS.find(m => m.id === modelId);
  if (model) return model.name;
  // Unknown id (e.g. a live OpenRouter id like "x-ai/grok-3" we didn't curate):
  // show a readable label — strip the vendor prefix, de-slug the rest.
  const tail = modelId.includes("/") ? modelId.split("/").slice(1).join("/") : modelId;
  return tail || modelId;
}

export function getModelProvider(modelId: string): string {
  const model = AI_MODELS.find(m => m.id === modelId);
  return model ? model.provider : "Unknown";
}

// Made with Bob
