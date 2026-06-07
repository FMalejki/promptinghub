// Image-generation model awareness. Kept separate from Filip's AI_MODELS so we
// can recognize image prompts (badge, filter, model links) without touching the
// create-form picker. Includes Adrian's targets (GPT-Image-2, Gemini image).

export const IMAGE_MODEL_IDS = new Set<string>([
  "dall-e-3",
  "dall-e-2",
  "stable-diffusion",
  "midjourney",
  "gpt-image-2",
  "gemini-image",
  "imagen-3",
  "flux",
]);

export function isImageModel(modelId: string): boolean {
  return IMAGE_MODEL_IDS.has(modelId);
}

export function isImagePrompt(p: { testedModels?: { modelId: string }[]; category?: string }): boolean {
  if ((p.category || "").toLowerCase() === "image generation") return true;
  return (p.testedModels || []).some((m) => isImageModel(m.modelId));
}

const MODEL_HOMES: Record<string, string> = {
  "dall-e-3": "https://chatgpt.com/",
  "dall-e-2": "https://labs.openai.com/",
  "gpt-image-2": "https://chatgpt.com/",
  midjourney: "https://www.midjourney.com/",
  "stable-diffusion": "https://stability.ai/",
  flux: "https://blackforestlabs.ai/",
  "gemini-image": "https://gemini.google.com/",
  "imagen-3": "https://deepmind.google/technologies/imagen-3/",
};

export function imageModelHome(modelId: string): string | null {
  return MODEL_HOMES[modelId] || null;
}
