import { buildManifest } from "../lib/manifest";

const detail = {
  id: "1",
  name: "Night Shift Agent",
  description: "An autonomous agent",
  category: "Agents",
  body: "ignored",
  files: [
    { path: "prompt.md", content: "# system", language: "markdown" },
    { path: "config.yaml", content: "model: claude", language: "yaml" },
  ],
  author: { email: "a@x.com", name: "Ada", image: null },
  image: null,
  stars: 3,
  isPrivate: false,
  testedModels: [],
  createdAt: new Date(),
  handle: "ada",
  slug: "night-shift-agent",
};

describe("buildManifest", () => {
  it("produces an install manifest with owner/slug + path/content files", () => {
    expect(buildManifest(detail as any)).toEqual({
      owner: "ada",
      slug: "night-shift-agent",
      name: "Night Shift Agent",
      description: "An autonomous agent",
      files: [
        { path: "prompt.md", content: "# system" },
        { path: "config.yaml", content: "model: claude" },
      ],
    });
  });

  it("strips language and other internal fields from files", () => {
    const m = buildManifest(detail as any);
    expect(Object.keys(m.files[0])).toEqual(["path", "content"]);
  });
});
