# Seed prompt test runs — real model verification

These are **genuine** test runs, not a claimed benchmark. Each seed prompt was
loaded and executed on **Claude Sonnet** (via isolated subagents — the subagent
*is* the model under test). For every prompt the tester invented a realistic
representative request, fulfilled it while obeying the prompt's rules, then
audited its own output against those rules (counting words, verifying gradients
by finite differences, checking the regex against every example, etc.).

- **Date:** 2026-06-08
- **Model under test:** Claude Sonnet
- **Method:** adopt prompt as system instructions → representative task → fulfill → self-audit vs. rules
- **Result: 22 / 22 PASS** (15 pro + 7 community)

> Note on `testedModels` in the datasets: it lists the models each prompt is
> *designed for*. This report is the evidence for the Claude entries. The
> non-Claude ids (GPT-4o, Gemini, DeepSeek) remain "designed for" — they were
> not run here (no external API key), and we don't claim otherwise.

## Pro set (`scripts/seed-data/pro-prompts.ts`) — 15/15 PASS

| Prompt | Representative task | Verdict |
|---|---|---|
| React 19 + Tailwind v4 Strict Architect | Debounced async search box w/ dropdown + skeleton | PASS — all 8 constraints, no useMemo/useCallback, `<thought>` first |
| Rust Concurrency Debugger — Arc/Mutex Deadlocks | AB/BA deadlock + guard-across-`.await` in two tokio tasks | PASS — lock graph, both anti-patterns caught, BEFORE/AFTER, cost stated |
| Postgres Query Optimizer — EXPLAIN ANALYZE | 18s 3-join query w/ seq scans + disk spills | PASS — root causes named, exact CREATE INDEX w/ column order, plan predicted |
| Staff-Level Code Reviewer | Review of a price-parsing snippet | PASS — all 4 severity tiers, code fixes, REQUEST-CHANGES verdict |
| Kubernetes Manifest Hardener | Insecure payment-api Deployment | PASS — securityContext/probes/limits/PDB; unknowns marked TODO |
| JWT Auth Red-Team Auditor | Express + jsonwebtoken RS256 setup | PASS — 7 ranked findings + fixes, "fix only three", no exploit payloads |
| Technical SEO Auditor | Next.js SaaS landing page | PASS — severity-sorted table over all 5 dimensions, 3 quick wins |
| B2B Cold Outbound Email Writer | Selling Depot to Retool's VP Eng | PASS — 65-word body, one number, lowercase subject, no buzzwords |
| PRD / Product Spec Writer | Vague "notifications to improve engagement" | PASS — vague goal pushed back, 8 sections, non-scope, phased kill criteria |
| Pandas Data-Wrangling Pair | Per-customer completed spend + last order | PASS — vectorized groupby-agg, dtype fix first, NaN-key footgun noted |
| System Design Interview Coach | URL shortener, candidate hand-waves scale | PASS — one question, demanded QPS back-of-envelope math |
| Conventional Commit & PR Description Writer | jwt.decode → jwt.verify security diff | PASS — `fix(auth):` header, why-not-what body, honest test plan, no invented changes |
| Blameless Incident Postmortem Author | 47-min payments outage (staging key in prod) | PASS — 5-whys to a systemic gate, zero blame, action table w/ owners |
| RAG Pipeline Architect | 50k-doc legal corpus, recall@5 ≥ 0.85 | PASS — 5-point checklist, hybrid+rerank, eval harness, latency/cost table |
| Regex Architect (plain-English) | Two whitespace-free words, one literal space (JS) | PASS — `/^\S+ \S+$/` verified against all 9 examples, ReDoS-free |

## Community set (`scripts/seed-data/community-prompts.ts`) — 7/7 PASS

| Prompt | Representative task | Verdict |
|---|---|---|
| Zero-to-Hero ML Tutor (build it from scratch) | Teach batch normalization | PASS — motivate→derive→NumPy→grad-check→PyTorch, ending exercise |
| Spelled-Out Backprop Walkthrough (micrograd-style) | `d = a*b + c` at a=2,b=3,c=1 | PASS — grads da=3,db=2,dc=1 confirmed by finite differences, both bugs named |
| Chain-of-Thought Decomposer | Round-trip cyclist speed/distance | PASS — d=12 km, self-checked via harmonic mean |
| Self-Consistency Reasoner | Two trains, staggered departure, meeting time | PASS — 3 distinct routes all give 11:36 AM, HIGH confidence |
| ReAct Agent Loop (reason + act + observe) | Avg population of Japan's 3 biggest cities | PASS — Thought→Action→Observation cycles, no fabricated observations |
| Tree-of-Thoughts Planner | Slow web app (first idea "add a CDN" is wrong) | PASS — 3 distinct branches, evaluated/pruned, expanded "profile first" |
| Few-Shot Classifier Builder | SaaS tickets → billing/bug/feature-request | PASS — MECE labels w/ boundaries, near-miss negatives, unsure escape, bias note |
