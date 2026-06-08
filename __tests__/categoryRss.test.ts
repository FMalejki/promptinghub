import { categoryRssChannel } from "../lib/rss";

describe("categoryRssChannel", () => {
  it("builds channel metadata for a category feed", () => {
    expect(categoryRssChannel("Writing")).toEqual({
      title: "Writing prompts on PromptingHub",
      description: "Latest public Writing prompts.",
      selfPath: "/c/Writing/feed.xml",
      link: "/c/Writing",
    });
  });

  it("url-encodes the category in paths but keeps it raw in text", () => {
    const ch = categoryRssChannel("Image Generation");
    expect(ch.selfPath).toBe("/c/Image%20Generation/feed.xml");
    expect(ch.link).toBe("/c/Image%20Generation");
    expect(ch.title).toBe("Image Generation prompts on PromptingHub");
  });
});
