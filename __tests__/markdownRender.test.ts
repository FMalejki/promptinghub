import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Markdown } from "../app/Markdown";

// Renders the actual <Markdown> component (the one used on prompt READMEs) to
// prove GFM tables produce a real <table>, not run-on paragraph text.
// JSX-free (React.createElement) so ts-jest needs no jsx transform override.
function html(src: string): string {
  return renderToStaticMarkup(createElement(Markdown, { src }));
}

describe("Markdown component — GFM table render", () => {
  const src = "| Phase | Figures out |\n|---|:--:|\n| 0 · Preflight | Project path |\n| 1 · What to do | Your goal |";

  it("emits a <table> with header cells and body rows", () => {
    const out = html(src);
    expect(out).toContain("<table");
    expect(out).toContain("<thead");
    expect(out).toContain("<th");
    expect(out).toContain("Phase");
    expect(out).toContain("Figures out");
    expect(out).toContain("0 · Preflight");
    expect(out).toContain("Project path");
    expect((out.match(/<tr/g) || []).length).toBe(3); // 1 header + 2 body
  });

  it("does NOT flatten the table into a paragraph (the reported bug)", () => {
    const out = html(src);
    // the broken behavior joined every row into one <p> with literal pipes
    expect(out).not.toContain("|---|");
    expect(out).not.toMatch(/<p[^>]*>[^<]*\| Phase \|/);
  });

  it("applies center alignment from the :--: delimiter", () => {
    const out = html(src);
    expect(out).toMatch(/<th[^>]*text-center/);
  });
});
