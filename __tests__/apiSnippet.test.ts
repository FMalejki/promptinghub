import { buildApiSnippets } from "../lib/apiSnippet";

describe("buildApiSnippets", () => {
  it("builds curl and node snippets against the public prompt endpoint", () => {
    const s = buildApiSnippets("https://hub.example.com", "abc123");
    expect(s.url).toBe("https://hub.example.com/api/prompts/abc123");
    expect(s.curl).toBe("curl https://hub.example.com/api/prompts/abc123");
    expect(s.node).toContain("fetch(\"https://hub.example.com/api/prompts/abc123\")");
    expect(s.node).toContain("await res.json()");
  });

  it("trims a trailing slash on the base url", () => {
    const s = buildApiSnippets("https://hub.example.com/", "x");
    expect(s.url).toBe("https://hub.example.com/api/prompts/x");
    expect(s.curl).not.toContain("com//");
  });
});
