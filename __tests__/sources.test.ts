import { twitterSource } from "../lib/sources/twitter";

describe("twitterSource (honest, env-gated)", () => {
  const orig = process.env.TWITTER_BEARER_TOKEN;
  afterEach(() => {
    if (orig === undefined) delete process.env.TWITTER_BEARER_TOKEN;
    else process.env.TWITTER_BEARER_TOKEN = orig;
  });

  it("reports disabled when no bearer token is configured", async () => {
    delete process.env.TWITTER_BEARER_TOKEN;
    const res = await twitterSource.fetchRecent("ai prompts");
    expect(res.enabled).toBe(false);
    expect(res.items).toEqual([]);
    expect(res.reason).toMatch(/token/i);
  });

  it("exposes a stable id and label for the source registry", () => {
    expect(twitterSource.id).toBe("twitter");
    expect(typeof twitterSource.label).toBe("string");
  });
});
