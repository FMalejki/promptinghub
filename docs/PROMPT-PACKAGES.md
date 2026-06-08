# Prompt packages, install & import

PromptingHub treats a prompt like a small **package**, not just a blob of text — much
like a GitHub repo. This doc covers the package format, how `npx promptinghub add`
works, and how to import existing prompts.

## A prompt is a package of files

A prompt can hold one or more files (`prompt.txt`, `system.md`, `config.yaml`,
`example.py`, `README.md`, …). Each file has a `path`, `content`, and an inferred
`language` (from its extension). Single-body prompts still work — they're stored as a
one-file package (`prompt.txt`).

```jsonc
{
  "name": "Cold outreach email",
  "files": [
    { "path": "system.md",   "content": "You are a B2B sales assistant…" },
    { "path": "prompt.txt",  "content": "Write a cold email to {{company}} about {{product}}." },
    { "path": "README.md",   "content": "# Cold outreach\nFill in company + product." }
  ]
}
```

- **`README.md`** in a package is rendered as formatted markdown on the prompt's page.
- **`{{variable}}`** / **`{{variable:default}}`** become fillable fields — readers
  customize the prompt live and copy the filled result, or **fork** their own copy.

## Namespacing

Every prompt has a canonical address: `@handle/slug` → `…/p/<handle>/<slug>`
(e.g. `adriankrawczyk/night-shift-agent`). Slugs are unique per owner and stable
across edits.

## Installing with the CLI

```bash
npx promptinghub add <handle>/<slug>
# e.g.
npx promptinghub add filipmalejki/distributed-systems-lab-7-agh-university
```

This fetches the package manifest from `GET /api/p/<handle>/<slug>/manifest` and writes
every file into `./<slug>/`. Each install bumps the prompt's copy/usage counter.

> **Does it need to be published to npm?** For the bare `npx promptinghub add …`
> command to work for everyone, yes — the `promptinghub` package must be published
> (`npm publish`). Until then `npx` can still run it without the registry:
> - from GitHub: `npx github:<owner>/<repo> add <handle>/<slug>`
> - from a local path: `npx ./cli add <handle>/<slug>`
>
> The manifest API works regardless — publishing only makes the command short.

## Importing an existing prompt

On **New Prompt → "Import from text"**, paste raw prompt text to auto-fill the form.
You can prepend a `---` frontmatter block to set metadata:

```text
---
name: Outreach Bot
description: Generates cold outreach emails
category: Marketing
models: gpt-4o, claude-opus-4
---
Write a cold email to {{company}} about {{product}}.
```

Recognized keys (case-insensitive): `name`/`title`, `description`/`desc`,
`category`/`cat`, `models`/`model` (comma-separated). Without frontmatter, the name and
description are derived from the first line. Import is **preview-only** via
`POST /api/import` — it never publishes; you review and edit before saving.

### External sources (X / Twitter)

Daily ingestion is built on a pluggable `PromptSource` interface. The X/Twitter source
uses the **official X API only** (`TWITTER_BEARER_TOKEN`) — no scraping, to respect the
platform's Terms of Service. Without a token the source is cleanly **disabled**
(`enabled: false`) so a scheduled job skips it rather than breaking or silently
importing nothing. Every fetched item is a draft a human curates before publishing.
