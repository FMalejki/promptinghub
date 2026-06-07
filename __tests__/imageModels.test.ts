import { isImageModel, isImagePrompt, imageModelHome, IMAGE_MODEL_IDS } from "../lib/imageModels";

describe("image model helpers", () => {
  it("recognizes known image models", () => {
    expect(isImageModel("dall-e-3")).toBe(true);
    expect(isImageModel("midjourney")).toBe(true);
    expect(isImageModel("stable-diffusion")).toBe(true);
    expect(isImageModel("gpt-image-2")).toBe(true);
    expect(isImageModel("gemini-image")).toBe(true);
    expect(isImageModel("gpt-4")).toBe(false);
    expect(isImageModel("claude-3-opus")).toBe(false);
  });

  it("flags a prompt as image-gen via tested models", () => {
    expect(isImagePrompt({ testedModels: [{ modelId: "midjourney" }], category: "Creative" })).toBe(true);
    expect(isImagePrompt({ testedModels: [{ modelId: "gpt-4" }], category: "Writing" })).toBe(false);
  });

  it("flags a prompt as image-gen via category", () => {
    expect(isImagePrompt({ testedModels: [], category: "Image Generation" })).toBe(true);
    expect(isImagePrompt({ testedModels: [], category: "image generation" })).toBe(true);
  });

  it("returns a model home/playground url when known", () => {
    expect(imageModelHome("midjourney")).toMatch(/midjourney/i);
    expect(imageModelHome("dall-e-3")).toMatch(/openai|chatgpt/i);
    expect(imageModelHome("gpt-4")).toBeNull();
  });

  it("exposes the id set", () => {
    expect(IMAGE_MODEL_IDS.has("dall-e-3")).toBe(true);
  });
});
