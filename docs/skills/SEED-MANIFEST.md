# Seeded-skills manifest

Provenance + safety record for skills published to PromptingHub from a private
local environment. Every item sourced from outside the repo is listed here with a
publish/skip decision and the reason. Gate: `lib/sanitize.ts` (`findSensitiveTokens`)
must return zero hits on any published content. Rule: **when in doubt, do not publish.**

## Published

| Skill | Source | Sanitization applied |
| ----- | ------ | -------------------- |
| **Grill Me With Evidence** (`grill-with-evidence`) | Local `grill-with-docs` skill, itself built on the public [mattpocock/skills — grill-me](https://github.com/mattpocock/skills) (freely available). | Removed a private ticket id (`SYNCD-*`), a personal tooling path (`~/…-routine/…`), the client/project name, and a personal "default routing" note. Replaced the worked example with a generic caching-layer decision. Verified clean via `findSensitiveTokens` (0 hits). |

The eight originally-authored flagship skills (Conventional Commit Writer, Pull
Request Reviewer, SQL Query Optimizer, Regex Builder & Explainer, Meeting Notes to
Action Items, Edge-Case Test Generator, Cold Email Rewriter, Anti-interruption
Autonomous Loop) were written from scratch for PromptingHub and contain no imported
private content — they are not part of this manifest's import provenance.

## Skipped (deliberately NOT published)

| Candidate | Reason |
| --------- | ------ |
| `argent-metro-debugger` | Tightly coupled to a specific tool's MCP command names (`debugger-connect`, `react-profiler-*`, etc.). Not universal/portable content, so it fails the "only universal" bar. No PII, but out of scope. |

## Not present / not reviewed

Only the two skills above existed under the local skills dir at review time. No
`CLAUDE.md`, memory files, env files, or routine logs were published — those are
private by default and excluded categorically.
