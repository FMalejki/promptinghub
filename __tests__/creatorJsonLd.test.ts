import { creatorJsonLd } from "../lib/jsonLd";

const base = "https://promptinghub.app";

const creator = {
  name: "Bob Kowalski",
  handle: "bob",
  image: "https://img/bob.png",
  bio: "I write prompts",
  website: "https://bob.dev",
  x: "bobk",
  github: "bobk",
};

describe("creatorJsonLd", () => {
  it("builds a ProfilePage wrapping a Person", () => {
    const ld = creatorJsonLd(creator as any, base);
    expect(ld["@context"]).toBe("https://schema.org");
    expect(ld["@type"]).toBe("ProfilePage");
    expect(ld.mainEntity["@type"]).toBe("Person");
    expect(ld.mainEntity.name).toBe("Bob Kowalski");
    expect(ld.mainEntity.url).toBe(`${base}/u/bob`);
    expect(ld.mainEntity.image).toBe("https://img/bob.png");
    expect(ld.mainEntity.description).toBe("I write prompts");
  });

  it("lists external profiles in sameAs (website + x + github)", () => {
    const ld = creatorJsonLd(creator as any, base);
    expect(ld.mainEntity.sameAs).toEqual([
      "https://bob.dev",
      "https://x.com/bobk",
      "https://github.com/bobk",
    ]);
  });

  it("strips a leading @ on the x handle and omits empty links", () => {
    const ld = creatorJsonLd({ ...creator, website: null, x: "@alice", github: null } as any, base);
    expect(ld.mainEntity.sameAs).toEqual(["https://x.com/alice"]);
  });

  it("omits sameAs entirely when there are no external links", () => {
    const ld = creatorJsonLd({ ...creator, website: null, x: null, github: null } as any, base);
    expect(ld.mainEntity.sameAs).toBeUndefined();
  });

  it("trims a trailing slash on the base url", () => {
    expect(creatorJsonLd(creator as any, `${base}/`).mainEntity.url).toBe(`${base}/u/bob`);
  });
});
