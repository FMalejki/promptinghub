import {
  playgroundProvider,
  playgroundAvailable,
  buildAnthropicRequest,
  extractAnthropicText,
  buildChatCompletionRequest,
  extractChatCompletionText,
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
  it("falls back to free Groq when only its key is present", () => {
    expect(playgroundProvider({ GROQ_API_KEY: "gsk_x" })).toBe("groq");
    expect(playgroundAvailable({ GROQ_API_KEY: "gsk_x" })).toBe(true);
  });
  it("prefers paid providers over Groq when several keys are set", () => {
    expect(playgroundProvider({ GROQ_API_KEY: "gsk_x", OPENAI_API_KEY: "sk-x" })).toBe("openai");
    expect(playgroundProvider({ GROQ_API_KEY: "gsk_x", ANTHROPIC_API_KEY: "sk-ant" })).toBe("anthropic");
  });
  it("ignores blank keys", () => {
    expect(playgroundProvider({ ANTHROPIC_API_KEY: "  " })).toBeNull();
    expect(playgroundProvider({ GROQ_API_KEY: "  " })).toBeNull();
  });
});

describe("buildChatCompletionRequest / extractChatCompletionText (OpenAI + Groq shape)", () => {
  it("builds a chat-completions body and clamps max_tokens", () => {
    const body = buildChatCompletionRequest("llama-3.3-70b-versatile", "Hi", 1024);
    expect(body.model).toBe("llama-3.3-70b-versatile");
    expect(body.messages).toEqual([{ role: "user", content: "Hi" }]);
    expect(buildChatCompletionRequest("m", "x", 999999).max_tokens).toBeLessThanOrEqual(4096);
  });
  it("pulls the assistant message text out of the response", () => {
    expect(extractChatCompletionText({ choices: [{ message: { content: "hello" } }] })).toBe("hello");
    expect(extractChatCompletionText({})).toBe("");
    expect(extractChatCompletionText(null)).toBe("");
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
