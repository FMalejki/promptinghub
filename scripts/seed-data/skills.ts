// Original, agent-ready "skills" authored for PromptingHub (not copied from any
// third party — safe to publish, no attribution needed; defaultSource is null
// when seeded). Each is multi-file (SKILL.md + a helper) and isSkill=true, so the
// /browse?skill=1 filter has real content. category MUST be in PROMPT_CATEGORIES.
import type { SeedPrompt } from "../../lib/seed";

const AUTHORS = {
  maya: { authorEmail: "maya.kowalski@promptinghub.app", authorName: "Maya Kowalski" },
  devin: { authorEmail: "devin.oyelaran@promptinghub.app", authorName: "Devin Oyelaran" },
  sora: { authorEmail: "sora.tanaka@promptinghub.app", authorName: "Sora Tanaka" },
  liam: { authorEmail: "liam.fitzgerald@promptinghub.app", authorName: "Liam Fitzgerald" },
  noor: { authorEmail: "noor.haddad@promptinghub.app", authorName: "Noor Haddad" },
};

export const SKILLS: SeedPrompt[] = [
  {
    name: "Conventional Commit Writer",
    description: "Turn a git diff into a clean Conventional Commits message — type, scope, subject, and a tight body.",
    category: "Coding",
    tags: ["git", "commits", "developer", "skill"],
    isSkill: true,
    testedModels: ["claude-3.7-sonnet", "gpt-4o", "gemini-2.0-flash"],
    ...AUTHORS.maya,
    readme:
      "# Conventional Commit Writer\n\nPaste a `git diff` (or `git diff --staged`) and get back a single, well-formed [Conventional Commits](https://www.conventionalcommits.org) message.\n\n**Use it for:** pre-commit hooks, PR hygiene, keeping a readable history.\n\n**Inputs:** a unified diff. **Output:** one commit message, nothing else.",
    files: [
      {
        path: "SKILL.md",
        content:
          "# Skill: Conventional Commit Writer\n\nYou write a single Conventional Commits message for a provided git diff.\n\n## Rules\n- Format: `type(scope): subject` then a blank line, then an optional body of 1–4 bullet points.\n- `type` ∈ feat, fix, docs, style, refactor, perf, test, build, ci, chore.\n- `scope` is the most-affected module/dir (omit if it spans many).\n- Subject: imperative mood, ≤ 60 chars, no trailing period.\n- Body bullets explain *why*, not a file-by-file restatement of the diff.\n- Add `BREAKING CHANGE:` footer only when a public API/contract changed.\n- Output ONLY the commit message — no prose, no code fences.\n\n## Procedure\n1. Identify the dominant intent of the diff (one commit = one logical change).\n2. Pick the single best `type`; if mixed, choose the highest-impact change.\n3. Derive `scope` from the common path prefix of changed files.\n4. Write the subject, then 1–4 *why* bullets.\n\nIf the diff is empty or unintelligible, reply exactly: `No diff detected — paste the output of \\`git diff\\`.`",
      },
      {
        path: "examples.md",
        content:
          "## Example\n\n**Diff (abridged):** added retry + backoff to `lib/http.ts`, updated a test.\n\n**Output:**\n```\nfeat(http): retry failed requests with exponential backoff\n\n- transient 5xx/network errors now retry up to 3x instead of failing fast\n- backoff is jittered to avoid thundering-herd on a flapping upstream\n```",
      },
    ],
  },
  {
    name: "Pull Request Reviewer",
    description: "Review a diff like a senior engineer: correctness, edge cases, security, and tests — ranked by severity.",
    category: "Code Review",
    tags: ["code-review", "pull-request", "quality", "skill"],
    isSkill: true,
    testedModels: ["claude-3.7-sonnet", "gpt-4o", "o3-mini"],
    ...AUTHORS.devin,
    readme:
      "# Pull Request Reviewer\n\nPaste a diff (or a PR description + diff). Returns findings grouped by **Blocking / Should-fix / Nit**, each with a file:line pointer and a concrete suggestion. Ends with one-line verdict.",
    files: [
      {
        path: "SKILL.md",
        content:
          "# Skill: Pull Request Reviewer\n\nReview the provided diff as a thoughtful senior engineer.\n\n## What to look for (in priority order)\n1. **Correctness** — logic errors, off-by-one, wrong null/empty handling, race conditions.\n2. **Security** — injection, missing authz checks, secrets in code, unsafe deserialization, SSRF.\n3. **Edge cases** — empty input, large input, unicode, timezones, concurrency.\n4. **Tests** — is the new behavior covered? Name the missing case.\n5. **Readability** — naming, dead code, needless complexity. (Lowest priority.)\n\n## Output format\nGroup findings under **🛑 Blocking**, **⚠️ Should-fix**, **💬 Nit**. For each:\n- `path:line` — what's wrong — concrete fix.\nThen a final line: `Verdict: approve | approve-with-nits | request-changes`.\n\nDo not invent issues to pad the list. If it's clean, say so and approve. Never restate the diff.",
      },
      {
        path: "checklist.md",
        content:
          "## Quick checklist\n- [ ] Errors handled, not swallowed\n- [ ] Inputs validated at the boundary\n- [ ] No N+1 queries / unbounded loops on user input\n- [ ] No secrets/tokens/PII added\n- [ ] New behavior has a test\n- [ ] Public API/contract changes are intentional + documented",
      },
    ],
  },
  {
    name: "SQL Query Optimizer",
    description: "Diagnose a slow SQL query: read the plan, find the bottleneck, and propose indexes or a rewrite.",
    category: "Data Analysis",
    tags: ["sql", "database", "performance", "skill"],
    isSkill: true,
    testedModels: ["claude-3.7-sonnet", "gpt-4o", "gemini-2.5-pro"],
    ...AUTHORS.sora,
    readme:
      "# SQL Query Optimizer\n\nGive it the query (and, if you have it, the `EXPLAIN`/`EXPLAIN ANALYZE` output and table sizes). Returns the likely bottleneck, suggested indexes, and a rewritten query — with the trade-offs called out.",
    files: [
      {
        path: "SKILL.md",
        content:
          "# Skill: SQL Query Optimizer\n\nYou optimize a slow SQL query.\n\n## Inputs you may receive\n- The query (required).\n- `EXPLAIN ANALYZE` output (optional).\n- Approx row counts / which columns are indexed (optional).\n\n## Procedure\n1. Restate what the query returns in one sentence (catch accidental cross-joins).\n2. Identify the most expensive step: full scans, nested loops over large sets, sorts/spills, or a non-sargable predicate (e.g. `WHERE fn(col) = …`).\n3. Propose the smallest set of indexes that helps (composite order matters: equality cols first, then range/sort col). Note write-cost.\n4. Offer a rewrite if it beats indexing (e.g. EXISTS over IN, window over self-join, predicate pushdown).\n5. State the expected effect and any trade-off.\n\n## Output\n- **Bottleneck:** …\n- **Indexes:** `CREATE INDEX …` (with why)\n- **Rewrite (if any):** ```sql …```\n- **Trade-offs:** …\n\nNever claim a speedup you can't justify from the query shape. Ask for the plan only if truly blocked.",
      },
      {
        path: "antipatterns.md",
        content:
          "## Common culprits\n- `WHERE DATE(created_at) = …` → non-sargable; use a range `>= … AND < …`.\n- `SELECT *` in a hot path → fetch only needed columns (enables covering indexes).\n- `OFFSET 100000 LIMIT 20` → keyset pagination instead.\n- `IN (subquery)` that returns dupes → `EXISTS`.\n- Leading wildcard `LIKE '%x'` → can't use a b-tree; consider trigram/full-text.",
      },
    ],
  },
  {
    name: "Regex Builder & Explainer",
    description: "Describe what you want to match in plain English; get a tested regex plus a token-by-token explanation.",
    category: "Coding",
    tags: ["regex", "developer", "text", "skill"],
    isSkill: true,
    testedModels: ["gpt-4o", "claude-3.5-sonnet", "gemini-2.0-flash"],
    ...AUTHORS.liam,
    readme:
      "# Regex Builder & Explainer\n\nSay what you want to match (and any examples that should/shouldn't match). Returns a regex, a plain-English breakdown of each part, and the match/no-match results on your examples.",
    files: [
      {
        path: "SKILL.md",
        content:
          "# Skill: Regex Builder & Explainer\n\nYou build a correct, readable regular expression from a plain-English spec.\n\n## Procedure\n1. Restate the requirement and list positive + negative examples (ask for some if none given).\n2. Build the regex. Prefer clarity over cleverness; anchor with `^`/`$` when matching whole strings; escape literals.\n3. Note the target flavor (PCRE / JavaScript / Python) — default to JavaScript and flag dialect-specific bits.\n4. Walk through the pattern token-by-token.\n5. Dry-run it against every example and show ✅/❌.\n\n## Output\n- **Pattern:** `/…/flags`\n- **Explanation:** bullet per token group\n- **Test results:** each example → matches? (and the captured groups)\n\nWarn about catastrophic backtracking (nested quantifiers like `(a+)+`) and suggest a safer form.",
      },
      {
        path: "cheatsheet.md",
        content:
          "## Mini cheatsheet\n- `\\\\d \\\\w \\\\s` digit/word/space · `\\\\b` word boundary\n- `?` optional · `*` 0+ · `+` 1+ · `{m,n}` range\n- `(?:…)` non-capturing · `(?<name>…)` named group\n- `(?=…)` lookahead · `(?<=…)` lookbehind\n- Always test against the strings that should NOT match.",
      },
    ],
  },
  {
    name: "Meeting Notes to Action Items",
    description: "Convert messy meeting notes or a transcript into owners, action items, decisions, and open questions.",
    category: "Productivity",
    tags: ["meetings", "notes", "action-items", "skill"],
    isSkill: true,
    testedModels: ["claude-3.5-sonnet", "gpt-4o", "gemini-2.0-flash"],
    ...AUTHORS.noor,
    readme:
      "# Meeting Notes → Action Items\n\nPaste raw notes or a transcript. Returns a tidy summary: **Decisions**, **Action items** (owner + due date when stated), and **Open questions** — nothing invented.",
    files: [
      {
        path: "SKILL.md",
        content:
          "# Skill: Meeting Notes to Action Items\n\nTurn raw meeting notes/transcript into a structured recap.\n\n## Output sections (omit a section if empty)\n1. **TL;DR** — 1–2 sentences.\n2. **Decisions** — bullet list of what was actually decided.\n3. **Action items** — `- [ ] <action> — @owner — due <date|n/a>`. Only assign an owner if the notes name one.\n4. **Open questions** — unresolved items needing follow-up.\n\n## Rules\n- Never invent an owner, date, or decision that isn't supported by the text.\n- Collapse duplicates; merge related points.\n- Keep each action atomic and verb-first ('Send', 'Draft', 'Decide').\n- If the input has no actionable content, say so plainly.",
      },
      {
        path: "format.md",
        content:
          "## Example output\n**TL;DR:** Agreed to ship the beta next Friday; pricing still open.\n\n**Decisions**\n- Beta launches Fri; feature-freeze Wed.\n\n**Action items**\n- [ ] Draft the launch email — @maya — due Wed\n- [ ] Finalize pricing tiers — @owner-unassigned — due n/a\n\n**Open questions**\n- Do we gate the beta behind a waitlist?",
      },
    ],
  },
  {
    name: "Edge-Case Test Generator",
    description: "From a function signature or spec, generate a ranked list of test cases — happy path, edges, and failure modes.",
    category: "Coding",
    tags: ["testing", "qa", "developer", "skill"],
    isSkill: true,
    testedModels: ["claude-3.7-sonnet", "gpt-4o", "o3-mini"],
    ...AUTHORS.devin,
    readme:
      "# Edge-Case Test Generator\n\nGive it a function signature, docstring, or short spec. Returns a categorized, deduplicated list of test cases (input → expected), prioritized by how likely each is to catch a real bug.",
    files: [
      {
        path: "SKILL.md",
        content:
          "# Skill: Edge-Case Test Generator\n\nProduce a strong set of test cases for the described function/endpoint.\n\n## Categories to cover\n- **Happy path** — typical valid inputs.\n- **Boundaries** — 0, 1, max, empty, just-over/just-under limits.\n- **Type/format** — null/undefined, wrong type, malformed string, unicode, very long input.\n- **State/ordering** — idempotency, concurrent calls, out-of-order events (if relevant).\n- **Failure modes** — what should throw/return an error, and how.\n\n## Output\nA table or list of `input → expected`, grouped by category, ordered by bug-catching value. Flag any spec ambiguity as an explicit assumption. Don't write the test framework boilerplate unless asked — focus on the *cases*.",
      },
      {
        path: "heuristics.md",
        content:
          "## Where bugs hide\n- Empty collections and single-element collections.\n- Off-by-one at range edges.\n- Timezone/DST and leap-day dates.\n- Duplicate keys, case sensitivity, trailing whitespace.\n- Numeric: 0, negative, float precision, overflow.\n- Re-entrancy: calling twice / partial failure rollback.",
      },
    ],
  },
  {
    name: "Cold Email Rewriter",
    description: "Rewrite a cold outreach email to be short, specific, and reply-worthy — with a clear ask and no fluff.",
    category: "Email",
    tags: ["sales", "outreach", "email", "skill"],
    isSkill: true,
    testedModels: ["gpt-4o", "claude-3.5-sonnet", "gemini-2.0-flash"],
    ...AUTHORS.maya,
    readme:
      "# Cold Email Rewriter\n\nPaste your draft (and, ideally, who it's going to). Returns a tightened version: a specific subject, a one-line relevance hook, a single clear ask, and a soft close — typically under 90 words.",
    files: [
      {
        path: "SKILL.md",
        content:
          "# Skill: Cold Email Rewriter\n\nRewrite a cold email so a busy person actually replies.\n\n## Principles\n- **One ask.** Make it specific and low-friction (a 15-min call, a yes/no, a pointer to the right person).\n- **Lead with them, not you.** First line shows you understand their context.\n- **Cut hype.** No 'revolutionary', 'synergy', 'I hope this email finds you well'.\n- **Length:** aim ≤ 90 words. Subject ≤ 6 words, concrete.\n- **Tone:** human, direct, respectful of their time.\n\n## Output\n1. **Subject:** …\n2. **Body:** the rewritten email.\n3. **Why:** 2–3 bullets on what you changed and the reasoning.\n\nIf key context is missing (recipient, the actual ask), ask one clarifying question first.",
      },
      {
        path: "before-after.md",
        content:
          "## Before → after\n**Before:** 'I hope this finds you well! We're a revolutionary platform that leverages AI to synergize your workflows. Would love to hop on a call to explore synergies!'\n\n**After:**\nSubject: question about your onboarding flow\n\n> Saw your team doubled headcount this quarter — congrats. We help support teams cut first-response time ~30% without adding tools. Worth a 15-min look next week? If not you, who owns this?",
      },
    ],
  },
];
