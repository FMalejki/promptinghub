import { tagRssChannel } from "../lib/rss";

describe("tagRssChannel", () => {
  it("builds channel metadata for a tag feed", () => {
    expect(tagRssChannel("seo")).toEqual({
      title: "#seo on PromptingHub",
      description: "Latest public prompts tagged #seo.",
      selfPath: "/t/seo/feed.xml",
      link: "/t/seo",
    });
  });

  it("url-encodes the tag in paths", () => {
    const ch = tagRssChannel("c++");
    expect(ch.selfPath).toBe("/t/c%2B%2B/feed.xml");
    expect(ch.link).toBe("/t/c%2B%2B");
    expect(ch.title).toBe("#c++ on PromptingHub");
  });
});
