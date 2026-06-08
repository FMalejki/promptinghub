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

// Modele AI dostępne do wyboru
export const AI_MODELS = [
  { id: "gpt-4", name: "GPT-4", provider: "OpenAI" },
  { id: "gpt-4-turbo", name: "GPT-4 Turbo", provider: "OpenAI" },
  { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo", provider: "OpenAI" },
  { id: "claude-3-opus", name: "Claude 3 Opus", provider: "Anthropic" },
  { id: "claude-3-sonnet", name: "Claude 3 Sonnet", provider: "Anthropic" },
  { id: "claude-3-haiku", name: "Claude 3 Haiku", provider: "Anthropic" },
  { id: "claude-2", name: "Claude 2", provider: "Anthropic" },
  { id: "gemini-pro", name: "Gemini Pro", provider: "Google" },
  { id: "gemini-ultra", name: "Gemini Ultra", provider: "Google" },
  { id: "llama-2-70b", name: "Llama 2 70B", provider: "Meta" },
  { id: "llama-2-13b", name: "Llama 2 13B", provider: "Meta" },
  { id: "mistral-large", name: "Mistral Large", provider: "Mistral AI" },
  { id: "mistral-medium", name: "Mistral Medium", provider: "Mistral AI" },
  { id: "codex", name: "Codex", provider: "OpenAI" },
  { id: "dall-e-3", name: "DALL-E 3", provider: "OpenAI" },
  { id: "stable-diffusion", name: "Stable Diffusion", provider: "Stability AI" },
  { id: "midjourney", name: "Midjourney", provider: "Midjourney" },
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
  return model ? model.name : modelId;
}

export function getModelProvider(modelId: string): string {
  const model = AI_MODELS.find(m => m.id === modelId);
  return model ? model.provider : "Unknown";
}

// Made with Bob
