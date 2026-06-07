// Render a collection export bundle as a single Markdown document, so a
// collection can be downloaded as readable docs (not just the JSON bundle).
// Pure — mirrors the shape returned by getCollectionExport.

import type { CollectionExport } from "./collections";

export function collectionToMarkdown(bundle: CollectionExport): string {
  let md = `# ${bundle.name}\n`;
  if (bundle.description.trim()) md += `\n${bundle.description}\n`;

  for (const p of bundle.prompts) {
    md += `\n## ${p.name}\n`;
    if (p.description.trim()) md += `\n${p.description}\n`;
    for (const f of p.files) {
      // Use ~~~ when the content itself contains a ``` fence so the block stays valid.
      const fence = f.content.includes("```") ? "~~~" : "```";
      md += `\n\`${f.path}\`\n\n${fence}\n${f.content}\n${fence}\n`;
    }
  }
  return md;
}
