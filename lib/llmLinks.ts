// Build "open this prompt in <assistant>" deep links. Where the assistant
// supports a prefill query param we embed the (length-capped) prompt; where it
// doesn't (Gemini), we just open the app and rely on the caller copying the
// prompt to the clipboard so the user can paste it.
// URLs have length limits, so the prompt text is trimmed and capped.

export const LLM_MAX_CHARS = 4000;

export type AssistantId = "chatgpt" | "claude" | "gemini" | "perplexity";

export type Assistant = {
  id: AssistantId;
  label: string;
  // Ready-to-open URL. Prefilled assistants carry the prompt in `?q=`; others
  // point at the app's new-chat surface.
  url: string;
  // True when the prompt text is embedded in the URL. When false the caller
  // must copy the prompt to the clipboard so the user can paste it.
  prefilled: boolean;
};

/**
 * Build the ordered list of "Open in <assistant>" targets for a prompt.
 * Returns null when there's no usable text (nothing to run).
 */
export function buildAssistantLinks(text: string): Assistant[] | null {
  const trimmed = (text || "").trim();
  if (!trimmed) return null;
  const q = encodeURIComponent(trimmed.slice(0, LLM_MAX_CHARS));
  return [
    { id: "chatgpt", label: "ChatGPT", url: `https://chatgpt.com/?q=${q}`, prefilled: true },
    { id: "claude", label: "Claude", url: `https://claude.ai/new?q=${q}`, prefilled: true },
    // Gemini has no stable prefill param — open the app; caller copies the text.
    { id: "gemini", label: "Gemini", url: "https://gemini.google.com/app", prefilled: false },
    { id: "perplexity", label: "Perplexity", url: `https://www.perplexity.ai/search?q=${q}`, prefilled: true },
  ];
}

// Bare-host Gemini URL used as the Android fallback (no "/app" path).
export const GEMINI_ANDROID_URL = "https://gemini.google.com/";

/**
 * The URL to actually open for an assistant, given the browser's user agent.
 * Identical to `assistant.url` everywhere except one case: on Android, "Open in
 * Gemini" must drop the "/app" path. `gemini.google.com/app` is claimed by the
 * installed Gemini app's Android App Link, and handing it to the app that way
 * crashes it on launch (verified on two devices). The bare host isn't
 * intercepted, so it loads web Gemini in the browser — where the user pastes
 * the prompt that was already copied to the clipboard. Kept pure + unit-tested
 * so this workaround can't silently regress.
 */
export function assistantOpenUrl(a: Pick<Assistant, "id" | "url">, userAgent?: string): string {
  const isAndroid = typeof userAgent === "string" && /android/i.test(userAgent);
  if (a.id === "gemini" && isAndroid) return GEMINI_ANDROID_URL;
  return a.url;
}
