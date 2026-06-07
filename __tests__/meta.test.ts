import { promptOgMetadata } from "../lib/meta";

describe("promptOgMetadata", () => {
  it("builds title/description and OpenGraph + Twitter cards", () => {
    const m = promptOgMetadata({
      name: "Cold Email",
      description: "A B2B cold email generator",
      image: "https://img/x.png",
    });
    expect(m.title).toBe("Cold Email · PromptingHub");
    expect(m.description).toBe("A B2B cold email generator");
    expect(m.openGraph?.title).toBe("Cold Email · PromptingHub");
    expect(m.openGraph?.images).toEqual([{ url: "https://img/x.png" }]);
    expect((m.twitter as { card?: string })?.card).toBe("summary_large_image");
  });

  it("truncates an overly long description", () => {
    const m = promptOgMetadata({ name: "P", description: "x".repeat(300) });
    expect((m.description as string).length).toBeLessThanOrEqual(200);
  });

  it("falls back to the dynamic OG image when none is provided", () => {
    const m = promptOgMetadata({ name: "Hello World", description: "a nice prompt" });
    const url = (m.openGraph?.images as { url: string }[])?.[0]?.url;
    expect(url).toContain("/api/og?");
    expect(url).toContain("title=Hello+World");
  });

  it("falls back to a generic card when the prompt is missing/private", () => {
    const m = promptOgMetadata(null);
    expect(m.title).toBe("Prompt · PromptingHub");
    expect(typeof m.description).toBe("string");
  });
});
