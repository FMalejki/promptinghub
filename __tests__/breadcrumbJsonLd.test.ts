import { promptBreadcrumbJsonLd } from "../lib/jsonLd";

const base = "https://promptinghub.app";

describe("promptBreadcrumbJsonLd", () => {
  it("builds a 3-level BreadcrumbList: Browse → Category → Prompt", () => {
    const ld = promptBreadcrumbJsonLd({ id: "abc", name: "Haiku Writer", category: "Writing" }, base);
    expect(ld["@context"]).toBe("https://schema.org");
    expect(ld["@type"]).toBe("BreadcrumbList");
    const items = ld.itemListElement;
    expect(items).toHaveLength(3);
    expect(items[0]).toMatchObject({ position: 1, name: "Browse", item: `${base}/browse` });
    expect(items[1]).toMatchObject({ position: 2, name: "Writing", item: `${base}/c/Writing` });
    expect(items[2]).toMatchObject({ position: 3, name: "Haiku Writer", item: `${base}/prompt/abc` });
  });

  it("url-encodes the category and trims a trailing slash on the base", () => {
    const ld = promptBreadcrumbJsonLd({ id: "x", name: "P", category: "Image Generation" }, `${base}/`);
    expect(ld.itemListElement[1].item).toBe(`${base}/c/Image%20Generation`);
  });

  it("omits the category level when there is no category", () => {
    const ld = promptBreadcrumbJsonLd({ id: "x", name: "P", category: "" }, base);
    expect(ld.itemListElement).toHaveLength(2);
    expect(ld.itemListElement[1]).toMatchObject({ position: 2, name: "P", item: `${base}/prompt/x` });
  });
});
