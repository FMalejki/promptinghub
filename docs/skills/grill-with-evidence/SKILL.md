---
name: grill-with-evidence
description: Interview the user about a plan or design one decision at a time — but every recommended answer must be backed by concrete, verifiable evidence (a file path + line, a log line, a docs URL with a quote, a git blame finding, or a web search result), never just opinion. Use when the stakes are high — architecture decisions, big refactors, "should we keep this infrastructure?", or PR-review prep — and intuition isn't enough.
---

# Skill: Grill Me With Evidence

A rigorous design interview. Walk the user down each branch of a decision tree one
question at a time, and for every question state your recommended answer **with receipts**
— evidence the user can independently verify — plus the strongest counter-argument.

## When to use

Reach for this when:
- The decision has long-lived consequences (architecture, infra, deletion, a costly migration).
- The user already pushed back on a vibes-based recommendation.
- The plan touches code or systems you haven't read yet.
- The user explicitly asks to be challenged "with evidence" or "hard".

For quick, low-stakes choices, a normal back-and-forth is fine — don't over-ceremony it.

## Procedure

Ask **one question at a time**. For each:

1. **Frame the fork.** Name the two or three options plainly. Don't smuggle your pick into the phrasing.
2. **Recommend an answer.** State it outright.
3. **Cite evidence for it.** At least one of:
   - A file path + line (`src/foo.ts:42`) you actually read this session.
   - A log file path and the relevant line or count.
   - A docs URL with a short quote.
   - A `git log` / `git blame` finding.
   - A web search result with a link.
   - An explicit "no evidence — pure judgment" disclaimer (use sparingly; it invites the user to override you).
4. **State the strongest counter-argument.** What would push you toward the other option?

If a question can be answered by reading the codebase, **explore first, then ask** — don't
make the user answer what a search would. If new evidence contradicts a recommendation you
made earlier in the same interview, **say so and revise**; self-correction beats consistency.

## Hard rules

- One question, one fork, one recommended answer, one piece of evidence, one counter-argument per turn. Never list several questions at once.
- Never fabricate file paths, line numbers, log lines, or quotes. If the evidence isn't real, label it "no evidence — pure judgment".
- When the user answers in one word (A/B/yes/no), accept it and move to the next branch — don't extract more justification.
- Stop when (a) the user says "enough" / "go", (b) the decision tree bottoms out, or (c) you've asked ~8 questions and the remaining branches are clearly low-stakes.

## Example of a good question turn

> **Q (1/N):** The service has two caching layers that overlap — keep both, or drop the in-memory one and rely on the shared cache?
>
> **Recommended:** Drop the in-memory layer.
>
> **Evidence:** `src/cache/memory.ts:88` shows a 30-second TTL, but `src/cache/shared.ts:12` already caches the same keys for 5 minutes — the in-memory layer is shadowed for all but the first 30s after a write. A load test log (`logs/2024-load.txt`, line 211) shows a 0.4% hit rate on the in-memory layer in production.
>
> **Counter:** if you expect a future read-heavy path that the shared cache can't reach (e.g. a tight loop inside one request), the in-memory layer is cheap insurance — keep it.
>
> **Your call: keep both, or drop in-memory?**

## Anti-pattern (what NOT to do)

> ~~"You should probably clean up the logs — they're getting big. Recommendation: rotate weekly."~~

Wrong because: "probably" + no log path + no current size + no rotation threshold + no evidence anyone is feeling pain. That's vibes, not evidence.

## Source

Builds on the public, freely-available [mattpocock/skills — grill-me](https://github.com/mattpocock/skills/blob/main/skills/productivity/grill-me/SKILL.md). The per-recommendation **evidence requirement** is the addition here.
