import { applyVariables } from "./template";
import type { NewPrompt } from "./prompts";

type ForkSource = {
  id: string;
  name: string;
  description: string;
  category: string;
  files: { path: string; content: string }[];
};

// Build the NewPrompt payload for forking a prompt with the user's filled-in template values.
// `forkedFrom` records the source id so lineage ("forked from X") and fork counts can be shown.
export function buildForkInput(source: ForkSource, values: Record<string, string>): NewPrompt {
  return {
    name: `${source.name} (fork)`,
    description: source.description,
    category: source.category,
    forkedFrom: source.id,
    files: source.files.map((f) => ({ path: f.path, content: applyVariables(f.content, values) })),
  };
}
