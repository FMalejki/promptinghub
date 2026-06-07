// Pure builder for "use this prompt via the API" code snippets. The single-prompt
// GET endpoint is public for public prompts, so these need no auth.

export type ApiSnippets = { url: string; curl: string; node: string };

export function buildApiSnippets(baseUrl: string, id: string): ApiSnippets {
  const url = `${baseUrl.replace(/\/$/, "")}/api/prompts/${id}`;
  return {
    url,
    curl: `curl ${url}`,
    node: `const res = await fetch("${url}");\nconst prompt = await res.json();\nconsole.log(prompt.files);`,
  };
}
