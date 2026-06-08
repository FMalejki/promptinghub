import {
  normalizeOpenRouterModels,
  mergeModels,
  type ModelOption,
} from "../lib/models";
import { AI_MODELS } from "../lib/constants";

describe("normalizeOpenRouterModels (pure)", () => {
  const raw = {
    data: [
      { id: "openai/gpt-5o", name: "OpenAI: GPT-5o", context_length: 200000 },
      { id: "anthropic/claude-4-sonnet", name: "Anthropic: Claude 4 Sonnet" },
      { id: "mistralai/mistral-next", name: "Mistral Next" }, // no "provider: " prefix
      { id: "", name: "junk" }, // dropped (no id)
      { id: "weird", name: "" }, // single-segment, empty name → name falls back to id
    ],
  };

  it("maps id/name/provider and drops entries without an id", () => {
    const out = normalizeOpenRouterModels(raw);
    expect(out.find((m) => m.id === "openai/gpt-5o")).toMatchObject({
      id: "openai/gpt-5o",
      name: "GPT-5o",
      provider: "OpenAI",
    });
    expect(out.some((m) => m.name === "junk")).toBe(false);
  });

  it("derives a display name by stripping the 'Vendor: ' prefix", () => {
    const out = normalizeOpenRouterModels(raw);
    expect(out.find((m) => m.id === "anthropic/claude-4-sonnet")!.name).toBe("Claude 4 Sonnet");
  });

  it("falls back to the id when the name is empty", () => {
    const out = normalizeOpenRouterModels(raw);
    expect(out.find((m) => m.id === "weird")!.name).toBe("weird");
  });

  it("tolerates malformed input without throwing", () => {
    expect(normalizeOpenRouterModels(null)).toEqual([]);
    expect(normalizeOpenRouterModels({})).toEqual([]);
    expect(normalizeOpenRouterModels({ data: "nope" })).toEqual([]);
  });
});

describe("mergeModels", () => {
  const curated: ModelOption[] = [
    { id: "gpt-4o", name: "GPT-4o", provider: "OpenAI" },
    { id: "other", name: "Other", provider: "Custom" },
  ];

  it("keeps curated entries first and appends novel live ones", () => {
    const live: ModelOption[] = [{ id: "x-ai/grok-9", name: "Grok 9", provider: "xAI" }];
    const out = mergeModels(curated, live);
    expect(out[0].id).toBe("gpt-4o");
    expect(out.some((m) => m.id === "x-ai/grok-9")).toBe(true);
    // "other" stays last
    expect(out[out.length - 1].id).toBe("other");
  });

  it("drops live entries that duplicate a curated model by name", () => {
    const live: ModelOption[] = [{ id: "openai/gpt-4o", name: "GPT-4o", provider: "OpenAI" }];
    const out = mergeModels(curated, live);
    expect(out.filter((m) => m.name === "GPT-4o")).toHaveLength(1);
    expect(out.find((m) => m.name === "GPT-4o")!.id).toBe("gpt-4o"); // curated id wins
  });

  it("returns curated unchanged when live is empty", () => {
    expect(mergeModels(curated, [])).toEqual(curated);
  });
});

describe("curated AI_MODELS are current", () => {
  it("no longer lists retired models and includes modern ones", () => {
    const ids = new Set<string>(AI_MODELS.map((m) => m.id));
    // retired / outdated entries removed
    expect(ids.has("gpt-3.5-turbo")).toBe(false);
    expect(ids.has("claude-2")).toBe(false);
    expect(ids.has("llama-2-70b")).toBe(false);
    expect(ids.has("gemini-pro")).toBe(false);
    // current models present
    expect(ids.has("gpt-4o")).toBe(true);
    expect(ids.has("claude-3.5-sonnet")).toBe(true);
    expect(ids.has("other")).toBe(true);
  });
});
