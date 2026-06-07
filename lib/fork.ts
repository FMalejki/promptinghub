import { applyVariables } from "./template";
import type { NewPrompt } from "./prompts";

type ForkSource = {
  name: string;
  description: string;
  category: string;
  files: { path: string; content: string }[];
};

// Build the NewPrompt payload for forking a prompt with the user's filled-in template values.
export function buildForkInput(source: ForkSource, values: Record<string, string>): NewPrompt {
  return {
    name: `${source.name} (fork)`,
    description: source.description,
    category: source.category,
    files: source.files.map((f) => ({ path: f.path, content: applyVariables(f.content, values) })),
  };
}
