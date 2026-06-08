import type { NamespacedPromptDetail } from "./prompts";

export type PromptManifest = {
  owner: string;
  slug: string;
  name: string;
  description: string;
  files: { path: string; content: string }[];
};

// A stable, install-oriented view of a prompt for the CLI (`npx promptinghub add owner/slug`).
export function buildManifest(detail: NamespacedPromptDetail): PromptManifest {
  return {
    owner: detail.handle,
    slug: detail.slug,
    name: detail.name,
    description: detail.description,
    files: detail.files.map((f) => ({ path: f.path, content: f.content })),
  };
}
