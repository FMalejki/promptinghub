import { buildOpenSearch } from "../lib/opensearch";

const base = "https://promptinghub.app";

describe("buildOpenSearch", () => {
  it("builds an OpenSearch description document", () => {
    const xml = buildOpenSearch(base);
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain('xmlns="http://a9.com/-/spec/opensearch/1.1/"');
    expect(xml).toContain("<ShortName>PromptingHub</ShortName>");
    expect(xml).toContain("<InputEncoding>UTF-8</InputEncoding>");
  });

  it("points the html search template at /browse?q={searchTerms}", () => {
    const xml = buildOpenSearch(base);
    expect(xml).toContain(`template="${base}/browse?q={searchTerms}"`);
    expect(xml).toContain('type="text/html"');
  });

  it("trims a trailing slash on the base url", () => {
    expect(buildOpenSearch(`${base}/`)).toContain(`template="${base}/browse?q={searchTerms}"`);
  });
});
