import {
  playgroundProvider,
  playgroundAvailable,
  buildAnthropicRequest,
  extractAnthropicText,
  PLAYGROUND_MAX_INPUT,
} from "../lib/playground";

describe("playgroundProvider / availability", () => {
  it("is null/unavailable when no key is set", () => {
    expect(playgroundProvider({})).toBeNull();
    expect(playgroundAvailable({})).toBe(false);
  });
  it("prefers Anthropic when its key is present", () => {
    expect(playgroundProvider({ ANTHROPIC_API_KEY: "sk-ant-x" })).toBe("anthropic");
    expect(playgroundAvailable({ ANTHROPIC_API_KEY: "sk-ant-x" })).toBe(true);
  });
  it("falls back to OpenAI when only its key is present", () => {
    expect(playgroundProvider({ OPENAI_API_KEY: "sk-x" })).toBe("openai");
  });
  it("ignores blank keys", () => {
    expect(playgroundProvider({ ANTHROPIC_API_KEY: "  " })).toBeNull();
  });
});

describe("buildAnthropicRequest", () => {
  it("builds a Messages API body with the prompt as the user message", () => {
    const body = buildAnthropicRequest("claude-3-5-haiku-latest", "Write a haiku", 512);
    expect(body.model).toBe("claude-3-5-haiku-latest");
    expect(body.max_tokens).toBe(512);
    expect(body.messages).toEqual([{ role: "user", content: "Write a haiku" }]);
  });
  it("clamps max_tokens to a sane ceiling", () => {
    const body = buildAnthropicRequest("m", "x", 999999);
    expect(body.max_tokens).toBeLessThanOrEqual(4096);
  });
});

describe("extractAnthropicText", () => {
  it("concatenates text blocks from the response", () => {
    expect(extractAnthropicText({ content: [{ type: "text", text: "Hello " }, { type: "text", text: "world" }] })).toBe(
      "Hello world",
    );
  });
  it("returns empty string on a malformed/empty response", () => {
    expect(extractAnthropicText({})).toBe("");
    expect(extractAnthropicText({ content: [] })).toBe("");
    expect(extractAnthropicText(null)).toBe("");
  });
});

describe("input guard", () => {
  it("exposes a max input length to cap abuse", () => {
    expect(PLAYGROUND_MAX_INPUT).toBeGreaterThan(0);
  });
});
