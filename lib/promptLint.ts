// A pure prompt-quality linter: scores a prompt's text against a fixed set of
// authoring heuristics and returns actionable hints. No external calls — every
// check is a local regex/length test so the result is deterministic and the UI
// can render a stable row set. This is advisory, not a judgement: a low score
// just means "here are easy wins", never "this prompt is bad".

export type LintSeverity = "info" | "warn";

export type LintCheck = {
  id:
    | "length"
    | "role"
    | "specificity"
    | "examples"
    | "format"
    | "variables"
    | "constraints"
    | "todo";
  label: string;
  pass: boolean;
  severity: LintSeverity;
  // Shown only when the check fails — a one-line suggestion for the author.
  hint: string;
};

export type LintResult = { score: number; checks: LintCheck[] };

const MIN_USEFUL_LENGTH = 20;

const ROLE = /\b(you are|act as|you're|as an? |your role|behave as)\b/i;
const EXAMPLE = /\b(for example|e\.g\.|for instance|example[:s]?)\b/i;
const FORMAT =
  /\b(json|markdown|yaml|xml|csv|table|bullet|bulleted|numbered list|format|heading|code block)\b/i;
const VARIABLE = /\{\{\s*[\w.-]+\s*\}\}/;
const CONSTRAINT =
  /\b(at most|no more than|fewer than|under \d|within \d|limit|maximum|concise|brief|exactly \d|word limit|in \d+ words?|step[- ]by[- ]step)\b/i;
const TODO = /\b(TODO|FIXME|XXX|TBD)\b/;
const VAGUE = /\b(something|stuff|etc\.?|and so on|whatever|some things?|you know)\b/i;

// Each check carries its own weight; the score is the weighted pass-rate. Role,
// specificity and length matter most for a usable prompt; the rest are bonuses.
const WEIGHTS: Record<LintCheck["id"], number> = {
  length: 3,
  role: 3,
  specificity: 2,
  todo: 2,
  examples: 1,
  format: 1,
  variables: 1,
  constraints: 1,
};

export function lintPrompt(input: string): LintResult {
  const text = (input ?? "").trim();

  const checks: LintCheck[] = [
    {
      id: "length",
      label: "Has enough detail",
      pass: text.length >= MIN_USEFUL_LENGTH,
      severity: "warn",
      hint: "Very short prompts leave the model guessing — add the task, context, and the desired outcome.",
    },
    {
      id: "role",
      label: "Sets a role or persona",
      pass: ROLE.test(text),
      severity: "info",
      hint: "Open with a role (“You are a senior copy editor…”) to anchor tone and expertise.",
    },
    {
      id: "specificity",
      label: "Avoids vague filler",
      pass: text.length > 0 && !VAGUE.test(text),
      severity: "warn",
      hint: "Replace vague words like “something”, “stuff”, or “etc.” with concrete instructions.",
    },
    {
      id: "examples",
      label: "Includes an example",
      pass: EXAMPLE.test(text),
      severity: "info",
      hint: "Show one worked example (“For example, …”) — it sharpens results more than extra description.",
    },
    {
      id: "format",
      label: "Specifies an output format",
      pass: FORMAT.test(text),
      severity: "info",
      hint: "Say how the answer should look (Markdown, JSON, a bulleted list) so the output is predictable.",
    },
    {
      id: "variables",
      label: "Uses reusable {{variables}}",
      pass: VARIABLE.test(text),
      severity: "info",
      hint: "Add {{placeholders}} for the parts that change so others can reuse this prompt with the install box.",
    },
    {
      id: "constraints",
      label: "Sets clear constraints",
      pass: CONSTRAINT.test(text),
      severity: "info",
      hint: "Bound the response (“at most 5 bullets”, “step by step”) to keep it focused.",
    },
    {
      id: "todo",
      label: "No unfinished markers",
      pass: !TODO.test(text),
      severity: "warn",
      hint: "Resolve TODO/FIXME/TBD notes before sharing — readers can’t see what you meant to add.",
    },
  ];

  const total = checks.reduce((sum, c) => sum + WEIGHTS[c.id], 0);
  const earned = checks.reduce((sum, c) => (c.pass ? sum + WEIGHTS[c.id] : sum), 0);
  const score = text.length === 0 ? 0 : Math.max(0, Math.min(100, Math.round((earned / total) * 100)));

  return { score, checks };
}
