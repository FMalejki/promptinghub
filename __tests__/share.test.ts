import { buildShareLinks } from "../lib/share";

describe("buildShareLinks", () => {
  const url = "https://hub.example.com/prompt/abc";
  const title = "Cold Email & Outreach";

  it("builds X / LinkedIn / Reddit intents with encoded url + title", () => {
    const s = buildShareLinks(url, title);
    expect(s.x).toBe(
      "https://twitter.com/intent/tweet?text=Cold%20Email%20%26%20Outreach&url=https%3A%2F%2Fhub.example.com%2Fprompt%2Fabc",
    );
    expect(s.linkedin).toContain("https://www.linkedin.com/sharing/share-offsite/?url=");
    expect(s.linkedin).toContain(encodeURIComponent(url));
    expect(s.reddit).toContain("https://www.reddit.com/submit?url=");
    expect(s.reddit).toContain("title=Cold%20Email%20%26%20Outreach");
  });
});
