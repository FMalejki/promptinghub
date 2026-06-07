// Lightweight, dependency-free stats for a prompt's text. Token count is a
// heuristic (~4 chars/token, the common GPT rule of thumb) and is only ever a
// rough guide — never a billing figure.

export type PromptStats = { words: number; chars: number; lines: number; tokens: number };

function wordCount(text: string): number {
  const t = text.trim();
  return t ? t.split(/\s+/).length : 0;
}

// Rough token estimate: max(ceil(chars/4), wordCount) so short-word text isn't
// undercounted. Empty string → 0.
export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.max(Math.ceil(text.length / 4), wordCount(text));
}

export function promptStats(text: string): PromptStats {
  return {
    words: wordCount(text),
    chars: text.length,
    lines: text ? text.split("\n").length : 0,
    tokens: estimateTokens(text),
  };
}
