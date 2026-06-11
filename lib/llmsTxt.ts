// Build an /llms.txt document (llmstxt.org): a curated, Markdown-structured map
// of the site for LLM crawlers — an H1 name, a blockquote summary, then H2
// sections of `[title](url): note` links. On-theme for a prompt platform: it
// tells an AI agent exactly where the useful prompts and surfaces live. Pure so
// the route just feeds it trending prompts.

export type LlmsTxtPrompt = {
  id: string;
  name: string;
  description?: string;
  handle?: string;
  slug?: string;
};

// Canonical URL rule: namespaced path when we have handle+slug, else the id route.
function promptPath(p: LlmsTxtPrompt): string {
  return p.handle && p.slug ? `/p/${p.handle}/${p.slug}` : `/prompt/${p.id}`;
}

function oneLine(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

export function buildLlmsTxt(baseUrl: string, prompts: LlmsTxtPrompt[]): string {
  const base = baseUrl.replace(/\/$/, "");

  const out: string[] = [
    "# PromptingHub",
    "",
    "> A community library of shareable AI prompts — browse, install, fork, and remix prompts for ChatGPT, Claude, and other models.",
    "",
    "PromptingHub hosts public prompts with descriptions, tested-model notes, and reusable `{{variables}}`. Every prompt has a plain-text and Markdown export, and the catalogue is also available as a sitemap.",
    "",
  ];

  if (prompts.length) {
    out.push("## Featured prompts", "");
    for (const p of prompts) {
      const url = `${base}${promptPath(p)}`;
      const desc = p.description ? oneLine(p.description) : "";
      out.push(`- [${oneLine(p.name)}](${url})${desc ? `: ${desc}` : ""}`);
    }
    out.push("");
  }

  out.push(
    "## Resources",
    "",
    `- [Browse all prompts](${base}/browse): search and filter the full catalogue`,
    `- [Trending](${base}/trending): the most-copied and most-starred prompts`,
    `- [Collections](${base}/collections): curated lists of related prompts`,
    `- [Sitemap](${base}/sitemap.xml): every public URL`,
    "",
  );

  return out.join("\n");
}
