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

// Placeholder images dla promptów bez własnego obrazka
export const PLACEHOLDER_IMAGES = [
  "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=400&h=300&fit=crop",
  "https://images.unsplash.com/photo-1676277791608-ac54525aa94d?w=400&h=300&fit=crop",
  "https://images.unsplash.com/photo-1675557009875-37f2f8e5e2e4?w=400&h=300&fit=crop",
  "https://images.unsplash.com/photo-1677756119517-756a188d2d94?w=400&h=300&fit=crop",
  "https://images.unsplash.com/photo-1676299081847-824916de030a?w=400&h=300&fit=crop",
];

export function getPlaceholderImage(seed: string): string {
  const hash = seed.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return PLACEHOLDER_IMAGES[hash % PLACEHOLDER_IMAGES.length];
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
