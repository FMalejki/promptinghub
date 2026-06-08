import { parsePastedPrompt, type ImportedDraft } from "../import";

/**
 * A pluggable external content source for daily prompt ingestion.
 *
 * The design is intentionally honest: a source can be *disabled* (e.g. no API
 * credentials, or scraping that would violate a platform's ToS). Callers must
 * check `enabled` before treating `items` as authoritative. Nothing here
 * publishes — items are drafts a human curates first.
 */
export type SourceResult = {
  enabled: boolean;
  items: ImportedDraft[];
  reason?: string;
};

export type PromptSource = {
  id: string;
  label: string;
  fetchRecent(query: string): Promise<SourceResult>;
};

/**
 * X/Twitter source. Requires an official API bearer token (TWITTER_BEARER_TOKEN)
 * — we do NOT scrape, to stay within X's Terms of Service. Without a token the
 * source returns `{ enabled: false }` so the cron can skip it cleanly rather
 * than silently importing nothing or breaking ToS.
 */
export const twitterSource: PromptSource = {
  id: "twitter",
  label: "X / Twitter (official API)",
  async fetchRecent(query: string): Promise<SourceResult> {
    const token = process.env.TWITTER_BEARER_TOKEN;
    if (!token) {
      return {
        enabled: false,
        items: [],
        reason: "TWITTER_BEARER_TOKEN not configured — official X API access is required (no scraping).",
      };
    }

    // With a token, query the official recent-search endpoint and turn each
    // matching tweet into a draft. Kept minimal + defensive; a human curates.
    const url = new URL("https://api.twitter.com/2/tweets/search/recent");
    url.searchParams.set("query", `${query} -is:retweet lang:en`);
    url.searchParams.set("max_results", "10");
    try {
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) {
        return { enabled: true, items: [], reason: `X API responded ${res.status}` };
      }
      const json = (await res.json()) as { data?: Array<{ text?: string }> };
      const items = (json.data || [])
        .map((t) => (t.text ? parsePastedPrompt(t.text, "twitter") : null))
        .filter((d): d is ImportedDraft => d !== null);
      return { enabled: true, items };
    } catch (err) {
      return { enabled: true, items: [], reason: `X API request failed: ${(err as Error).message}` };
    }
  },
};
