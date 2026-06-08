// Render a single prompt as a readable Markdown document (title + description +
// fenced files), complementing the plain-text /raw endpoint. Pure.

type PromptMd = {
  name: string;
  description: string;
  body?: string;
  files?: { path: string; content: string }[] | null;
};

function fence(content: string): string {
  // Switch to ~~~ when the content itself contains a ``` fence, to stay valid.
  return content.includes("```") ? "~~~" : "```";
}

export function promptToMarkdown(p: PromptMd): string {
  let md = `# ${p.name}\n`;
  if (p.description && p.description.trim()) md += `\n${p.description}\n`;

  const files = p.files && p.files.length ? p.files : null;
  if (files) {
    const multi = files.length > 1;
    for (const f of files) {
      if (multi) md += `\n## \`${f.path}\`\n`;
      const fc = fence(f.content);
      md += `\n${fc}\n${f.content}\n${fc}\n`;
    }
  } else {
    const fc = fence(p.body ?? "");
    md += `\n${fc}\n${p.body ?? ""}\n${fc}\n`;
  }
  return md;
}
