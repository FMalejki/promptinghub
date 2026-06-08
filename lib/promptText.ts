// Flatten a prompt (files or body) into a single text blob for diffing/compare.
export function promptToText(p: { body?: string; files?: { path: string; content: string }[] | null }): string {
  if (p.files && p.files.length) return p.files.map((f) => `# ${f.path}\n${f.content}`).join("\n\n");
  return p.body ?? "";
}

// Plain text for piping (`curl .../raw | pbcopy`): a single-file prompt returns
// just its content (no path header); multi-file keeps the path headers.
export function rawPromptText(p: { body?: string; files?: { path: string; content: string }[] | null }): string {
  if (p.files && p.files.length === 1) return p.files[0].content;
  return promptToText(p);
}
