// Build "open this prompt in <assistant>" deep links that prefill the chat box.
// URLs have length limits, so the prompt text is trimmed and capped.

export const LLM_MAX_CHARS = 4000;

export type LlmLinks = { chatgpt: string; claude: string };

export function buildLlmLinks(text: string): LlmLinks | null {
  const trimmed = (text || "").trim();
  if (!trimmed) return null;
  const q = encodeURIComponent(trimmed.slice(0, LLM_MAX_CHARS));
  return {
    chatgpt: `https://chatgpt.com/?q=${q}`,
    claude: `https://claude.ai/new?q=${q}`,
  };
}
