import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PromptCard } from "../app/components/PromptCard";

// Renders the actual <PromptCard> (used in the related / by-tag / by-author
// sections of the prompt detail page) to prove it does NOT emit an <a> nested
// inside another <a> — the invalid HTML that fires React's
// "In HTML, <a> cannot be a descendant of <a>" hydration warning many times.
function html(props: Parameters<typeof PromptCard>[0]): string {
  return renderToStaticMarkup(createElement(PromptCard, props));
}

// Walk the flat markup and track <a> nesting depth; the max depth seen tells
// us whether any anchor is rendered inside another anchor.
function maxAnchorDepth(markup: string): number {
  const tokens = markup.match(/<a\b|<\/a>/g) || [];
  let depth = 0;
  let max = 0;
  for (const t of tokens) {
    if (t === "</a>") depth = Math.max(0, depth - 1);
    else {
      depth += 1;
      max = Math.max(max, depth);
    }
  }
  return max;
}

const base = {
  id: "abc123",
  name: "Test Prompt",
  description: "A prompt for testing",
  category: "Coding",
  author: { name: "Ada", image: null, handle: "ada" },
  image: null,
  stars: 5,
  isPrivate: false,
};

describe("PromptCard — no nested anchors", () => {
  it("renders the card link AND the author link without nesting them", () => {
    const out = html(base);
    // Both links are present...
    expect(out).toContain('href="/prompt/abc123"');
    expect(out).toContain('href="/u/ada"');
    // ...but neither is a descendant of the other.
    expect(maxAnchorDepth(out)).toBe(1);
  });

  it("stays flat even with no author handle (no author link)", () => {
    const out = html({ ...base, author: { name: "Ada", image: null, handle: null } });
    expect(out).toContain('href="/prompt/abc123"');
    expect(maxAnchorDepth(out)).toBeLessThanOrEqual(1);
  });
});
