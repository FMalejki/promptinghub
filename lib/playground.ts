// Env-gated "run this prompt against an LLM" playground. Pure helpers here so the
// route stays thin and the gating/parsing is unit-testable; the actual network
// call lives in the route and only fires when a provider key is configured.

export type PlaygroundProvider = "anthropic" | "openai";

export const PLAYGROUND_MAX_INPUT = 12000; // chars — cap request size
export const PLAYGROUND_MAX_TOKENS = 4096; // ceiling for the completion
export const DEFAULT_ANTHROPIC_MODEL = "claude-3-5-haiku-latest";

type Env = Record<string, string | undefined>;

function has(v: string | undefined): boolean {
  return !!v && v.trim().length > 0;
}

// Which provider to use, based on configured keys (Anthropic preferred). Null
// when nothing is configured → the route returns a clear "not configured" state.
export function playgroundProvider(env: Env): PlaygroundProvider | null {
  if (has(env.ANTHROPIC_API_KEY)) return "anthropic";
  if (has(env.OPENAI_API_KEY)) return "openai";
  return null;
}

export function playgroundAvailable(env: Env): boolean {
  return playgroundProvider(env) !== null;
}

export type AnthropicRequest = {
  model: string;
  max_tokens: number;
  messages: { role: "user"; content: string }[];
};

export function buildAnthropicRequest(model: string, userText: string, maxTokens: number): AnthropicRequest {
  return {
    model,
    max_tokens: Math.max(1, Math.min(maxTokens, PLAYGROUND_MAX_TOKENS)),
    messages: [{ role: "user", content: userText }],
  };
}

export function extractAnthropicText(json: any): string {
  const content = json && Array.isArray(json.content) ? json.content : [];
  return content
    .filter((b: any) => b && b.type === "text" && typeof b.text === "string")
    .map((b: any) => b.text)
    .join("");
}
