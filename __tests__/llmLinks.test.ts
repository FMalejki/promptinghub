import { buildAssistantLinks, LLM_MAX_CHARS, type AssistantId } from "../lib/llmLinks";

function byId(text: string) {
  const list = buildAssistantLinks(text)!;
  return Object.fromEntries(list.map((a) => [a.id, a])) as Record<AssistantId, (typeof list)[number]>;
}

describe("buildAssistantLinks", () => {
  it("includes ChatGPT, Claude, Gemini and Perplexity in order", () => {
    const list = buildAssistantLinks("Write a haiku about the sea")!;
    expect(list.map((a) => a.id)).toEqual(["chatgpt", "claude", "gemini", "perplexity"]);
  });

  it("prefills ChatGPT / Claude / Perplexity with the url-encoded prompt", () => {
    const a = byId("Write a haiku about the sea");
    expect(a.chatgpt.url).toBe("https://chatgpt.com/?q=Write%20a%20haiku%20about%20the%20sea");
    expect(a.claude.url).toBe("https://claude.ai/new?q=Write%20a%20haiku%20about%20the%20sea");
    expect(a.perplexity.url).toBe("https://www.perplexity.ai/search?q=Write%20a%20haiku%20about%20the%20sea");
    expect(a.chatgpt.prefilled).toBe(true);
    expect(a.claude.prefilled).toBe(true);
    expect(a.perplexity.prefilled).toBe(true);
  });

  it("opens Gemini at the app (no prefill) so the caller copies the prompt", () => {
    const a = byId("Write a haiku about the sea");
    expect(a.gemini.url).toBe("https://gemini.google.com/app");
    expect(a.gemini.prefilled).toBe(false);
    expect(a.gemini.url).not.toContain("?q=");
  });

  it("returns null for empty / whitespace text (nothing to open)", () => {
    expect(buildAssistantLinks("")).toBeNull();
    expect(buildAssistantLinks("   \n  ")).toBeNull();
  });

  it("trims surrounding whitespace before encoding", () => {
    expect(byId("  hi  ").chatgpt.url).toBe("https://chatgpt.com/?q=hi");
  });

  it("truncates very long prompts to keep prefilled URLs within limits", () => {
    const long = "x".repeat(LLM_MAX_CHARS + 500);
    const a = byId(long);
    const q = decodeURIComponent(new URL(a.claude.url).searchParams.get("q") || "");
    expect(q.length).toBe(LLM_MAX_CHARS);
  });

  it("encodes special characters safely", () => {
    const a = byId("a & b = c? <tag>");
    expect(a.chatgpt.url).toContain("a%20%26%20b%20%3D%20c%3F%20%3Ctag%3E");
    expect(a.chatgpt.url).not.toContain("<tag>");
  });
});
