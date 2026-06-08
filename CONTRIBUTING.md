# Contributing to PromptingHub

Thanks for helping build the GitHub-for-prompts. This guide covers local setup,
our test-first workflow, and PR conventions.

## Local setup

```bash
npm install
cp .env.local.example .env.local   # then fill in the values below
npm run dev                        # http://localhost:3000
```

Required env vars (`.env.local`):

| Var | Purpose |
| --- | --- |
| `MONGODB_URI` | MongoDB connection string |
| `MONGODB_DB` | Database name |
| `NEXTAUTH_SECRET` | NextAuth session secret |
| `NEXTAUTH_URL` | e.g. `http://localhost:3000` |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | optional Google OAuth |

Optional (feature-gated, safe to omit):

| Var | Purpose |
| --- | --- |
| `VERIFIED_HANDLES` | comma-separated handles to mark verified |
| `NEXT_PUBLIC_SITE_URL` | canonical URL for sitemap/OG |
| `TWITTER_BEARER_TOKEN` | enables the X ingest source (official API only) |
| `INGEST_QUERY` | search query for daily ingest |
| `CRON_SECRET` | protects `/api/cron/*` |

## Test-driven development

This project is **TDD-first**. Write a failing test, then the implementation.

```bash
npm test                       # jest + mongodb-memory-server
npx tsc --noEmit               # type-check (must be clean)
```

- Pure logic lives in `lib/` and is unit-tested in `__tests__/`.
- DB-touching helpers are tested against `mongodb-memory-server` (no live DB needed).
- Keep route handlers thin — push logic into `lib/` so it's testable.
- **Never** run `npm run build` while the dev server is running — they share `.next`
  and the prod build clobbers dev chunks. Use `npx tsc --noEmit`; let Vercel build.

## UI verification

For anything observable in the browser, verify it (don't ask a human to): run the
dev server and click through the affected flow. Share a screenshot or the relevant
DOM/network state in the PR.

## Pull requests

- One feature per branch: `ns/<short-name>` (e.g. `ns/collections`).
- `npm test` + `npx tsc --noEmit` must pass before opening a PR.
- Keep PRs focused; describe **what** changed, **why**, and how it was verified.
- Match the surrounding code's style and idioms.

## Project shape

- `app/` — Next.js App Router pages + API routes. Server components export
  `generateMetadata`; interactive views are `"use client"` children.
- `lib/` — domain logic (prompts, collections, users, pricing, import, markdown…).
- `__tests__/` — jest specs mirroring `lib/`.
- `cli/` — the `promptinghub` CLI (`npx promptinghub add owner/slug`).
- See [docs/PROMPT-PACKAGES.md](docs/PROMPT-PACKAGES.md) for the package/install format.
