import { buildLlmLinks, LLM_MAX_CHARS } from "../lib/llmLinks";

describe("buildLlmLinks", () => {
  it("builds ChatGPT and Claude links with the prompt url-encoded", () => {
    const links = buildLlmLinks("Write a haiku about the sea")!;
    expect(links.chatgpt).toBe("https://chatgpt.com/?q=Write%20a%20haiku%20about%20the%20sea");
    expect(links.claude).toBe("https://claude.ai/new?q=Write%20a%20haiku%20about%20the%20sea");
  });

  it("returns null for empty / whitespace text (nothing to open)", () => {
    expect(buildLlmLinks("")).toBeNull();
    expect(buildLlmLinks("   \n  ")).toBeNull();
  });

  it("trims surrounding whitespace before encoding", () => {
    expect(buildLlmLinks("  hi  ")!.chatgpt).toBe("https://chatgpt.com/?q=hi");
  });

  it("truncates very long prompts to keep the URL within limits", () => {
    const long = "x".repeat(LLM_MAX_CHARS + 500);
    const links = buildLlmLinks(long)!;
    const q = decodeURIComponent(new URL(links.claude).searchParams.get("q") || "");
    expect(q.length).toBe(LLM_MAX_CHARS);
  });

  it("encodes special characters safely", () => {
    const links = buildLlmLinks("a & b = c? <tag>")!;
    expect(links.chatgpt).toContain("a%20%26%20b%20%3D%20c%3F%20%3Ctag%3E");
    expect(links.chatgpt).not.toContain("<tag>");
  });
});
