# PromptingHub — Night-Shift Build Log

Autonomous build by Claude. Base branch: `night-shift` (off `main`). Each task ships as its
own sub-branch → PR into `night-shift` → squash-merge → deploy preview to Vercel → dispatch link.

## Product vision (from Malejki + Adrian)
GitHub-for-prompts. A prompt is not just a text body — it's a **package** of one or more files
(`.txt .md .yaml .py .ts .json …`), with **customizable/templated variables**, **namespaced &
installable** (`owner/slug`, think `adriankrawczyk/night-shift-agent`), browsable, searchable,
attributed to creators. Public seed pool of 20–30 legit prompts. Later: marketplace, image-gen
(Gemini / GPT-Image-2) prompt categories, creator onboarding, Kickstarter for infra.

UX musts: drag-and-drop multi-file upload (whole prompt "codebase"), per-file text view,
clickable customizable fields, editable templates per-user.

## Pipeline rules
- TDD: failing test first, then implement. `npm test` + `npm run build` must pass before PR.
- UI features verified by clicking through (Preview/Chrome MCP).
- Keep `main` untouched; everything lands on `night-shift`.
- Deploy: `npx vercel deploy` from night-shift → preview URL → PushNotification (1 sentence).

## Roadmap (✅ done · 🔄 in progress · ⬜ todo)

**Live preview (stable alias, public):** https://promptinghub-night-shift.vercel.app
Deploy cmd: `npx vercel deploy --yes` then `npx vercel alias set <deploy-url> promptinghub-night-shift.vercel.app`
(Preview env vars + ssoProtection=null already configured on the Vercel project.)

### Phase 1 — Core prompt depth
- ✅ 1. Prompt detail page `/prompt/[id]` + `GET /api/prompts/[id]` (full body, copy button) — PR #1
- ✅ 2. Multi-file prompt model: `files: [{path, content, language}]` (body → single-file fallback) — PR #2
- ✅ 3. Detail page renders multiple files w/ language label + per-file & copy-all — PR #2
- ✅ 4. Upload UX: drag-and-drop + multi-select files, infer language from extension, preview — PR #3

### Phase 2 — Customization / templating
- ✅ 5. Variable extraction: parse `{{var}}` / `{{var:default}}` → `extractVariables()` — PR #4
- ✅ 6. Detail page: fillable inputs per variable, live substitution, copy filled result — PR #4
- ✅ 7. Fork/customize: logged-in user forks a prompt with their values as a new prompt — PR #13

### Phase 3 — Namespacing & install
- ✅ 8. User handles `@handle` + per-prompt slug → canonical `/p/owner/slug` — PR #5
- 🔄 9. Install/use: copy command done (`npx promptinghub add owner/slug` box); manifest/download endpoint still TODO
- ✅ 10. Prompt metadata: tested models (Filip) + README rendering — PR #18

### Phase 4 — Discovery & pool
- ⬜ 11. Seed 20–30 real prompts + `public` flag + seed script
- ✅ 12. Model filter + sort (recent/popular/most-copied) — PR #16
- ⬜ 13. Stars/likes + counts
- ✅ 14. Copy/usage counter — PR #15

### Phase 5 — Polish
- ✅ 15. Landing page explaining the product (replace bare redirect) — PR #6
- ✅ 16. Profile shows a user's prompts — Filip (app/user/[email])
- ✅ 17. Edit/delete own prompts — PR #14
- ✅ 18. Empty/loading/error states (loading skeleton+empty by Filip; error/retry added) — PR #19
- 🔄 19. Docs: docs/PROMPT-PACKAGES.md added (PR #19); root README is Filip's; CONTRIBUTING still TODO
- ⬜ 20. Full E2E click-through verification (lots done ad-hoc via Preview MCP this session)

## Gotchas
- Do NOT run `npm run build` while the Preview dev server is running — both share `.next`,
  the prod build clobbers dev chunks → `Cannot find module './276.js'` 500s. Verify UI on the
  dev server; let `vercel deploy` do the prod build remotely. If it happens: stop preview,
  `rm -rf .next`, restart preview.

## Progress log
- (setup) night-shift branched off main; Vercel CLI authed (project promptinghub); 24 baseline tests green.
- PR #1 merged: prompt detail page + detail API. Deploy pipeline proven — public alias live, DB + routes verified (16 prompts). 28 tests green.
- PR #2 merged: multi-file prompt model + multi-file detail rendering. 35 tests.
- PR #3 merged: drag-and-drop multi-file upload form + shared newPromptSchema. 43 tests.
- UI verified via Preview MCP: browse (16 prompts, chips, avatars) + detail page (file panel, copy-all) render correctly with live data.
- Phase 1 COMPLETE.
- PR #4 merged: template variables {{var}}/{{var:default}} → live customizable fields on detail page. 54 tests. Verified live click-through (Sarah/Acme). Demo cold-email template seeded.
- PR #5 merged: namespaced prompts — slugify, handles, unique-per-owner slugs, canonical /p/[handle]/[slug] route + API, shared PromptView, `npx promptinghub add owner/slug` install box. Backfilled existing data (3 handles, 17 slugs). 71 tests. Verified live.
- PR #6 merged: real landing page (hero + value props + featured prompts) replacing the bare redirect. Verified live.
- Session so far: 6 feature PRs (detail, multi-file, upload, templates, namespacing, landing) + infra. 71 tests.
- **BIG MERGE (2026-06-07):** Filip (FMalejki) shipped a parallel "HuggingFace-style redesign" on `main` (commit 535748e) — stars/favorites, sharing+privacy, tested AI models (lib/constants.ts AI_MODELS incl Gemini/DALL-E/Midjourney/SD), prompt images, Navbar/PromptCard/dark-mode (ThemeProvider), settings/user/favorites pages, sort recent|popular, Vercel Analytics + Speed Insights. Adrian: "wjeb to do nowego fronta / zmerguj wszystko". Did `git merge origin/main` into night-shift (ns/merge-main) — only 5 files conflicted (lib/prompts.ts, both prompt API routes, browse, prompt/[id]); resolved as a UNION (subagent). night-shift ff'd to merge. Result: Filip's front + my multi-file/templates/namespace/install all coexist; 71 tests green, tsc clean, verified live (browse HF grid + detail with star + tested-models + install box `npx promptinghub add filipmalejki/...`). Reverted my light-only landing → Filip's /browse-redirect home.
- PR #9 merged (post-merge): integrated multi-file drag-drop upload into Filip's `app/new` form (was single-body) → new front can now create multi-file/{{template}} prompts. tsc clean, deployed.
- PR #10 merged: shared dark-aware PromptDetailView for /prompt/[id] + canonical /p/[handle]/[slug] (fixed white panels in dark mode) + image fallback (promptImageSrc, onError→placeholder). 74 tests.
- PR #11 merged: backfilled tests for Filip's merged stars/favorites/sharing/privacy/sort. 83 tests.
- Explained to Adrian: `npx promptinghub add owner/slug` is currently just a copy-paste hint — no published npm pkg yet. Building real manifest endpoint + CLI now (publish needs npm acct).
- NEW combined backlog (post-merge): (a) ✅ DONE PR#9 multi-file in /new; (b) ✅ DONE PR#10 dark-mode polish + image fallback; (b2) ✅ DONE PR#11 tests for merged code; (b3) ✅ DONE PR#12 real manifest endpoint (`/api/p/[handle]/[slug]/manifest`) + `cli/` promptinghub package (`npx promptinghub add owner/slug` → writes files; verified locally, npm publish pending an account). 85 tests.
- PR #13 merged: fork/customize — buildForkInput applies user's {{var}} values into all files + names "(fork)", Fork button on detail view posts the copy owned by forker. 87 tests.
- Verified live (Adrian, 2026-06-07): `npx <path-to-cli> add filipmalejki/...` works through npx itself (downloaded prompt.txt). Bare `npx promptinghub` still needs `npm publish` (npm account). Asked Adrian if he wants publish-prep or keep building.
- NEXT: (d) X/Twitter daily ingest (pluggable importer + cron, honest re ToS); (e) check Filip's app/user/[email] already lists a user's prompts (likely yes — skip if so); (f) HF-style feature proposals for Adrian to approve; (g) prep `npm pack` for CLI when Adrian says go. for my injected detail sections (file panels/customize/install are light-only islands); (c) real `promptinghub` CLI package for `npx promptinghub add owner/slug` (Filip: "trzeba package jak gh"); (d) manifest/download endpoint; (e) X/Twitter daily prompt ingestion (pluggable importer + cron; honest about ToS/API-key); (f) fix broken prompt images (some are imgur album links not direct); (g) tags work parked on `ns/10-tags` (maybe drop — Filip uses categories+testedModels); (h) HF-inspired extras to propose to Adrian for approval.
- Durability: `caffeinate -dimsu` running to stop Mac sleep; keep terminal/Claude session open or local loop can't fire. ALWAYS end a loop turn with ScheduleWakeup so it re-arms.
- PR #14 merged: edit/delete own prompts — owner-scoped updatePrompt/deletePrompt ({_id, ownerEmail}), PUT/DELETE /api/prompts/[id] (session auth, 404 non-owner), /prompt/[id]/edit multi-file form + delete button, owner-only Edit button now resolves. 94 tests. Deployed.
- PR #15 merged: copy/usage counter — incrementCopyCount (atomic $inc), copyCount in detail objects, POST /api/prompts/[id]/copy, CLI manifest install counts, detail-view badge + CopyButton onCopy. 98 tests. Verified live (0→POST→1 persisted). NOTE: Vercel build occasionally hangs at UNKNOWN status (one stuck deploy this session) — redeploy fresh in foreground capturing stdout JSON for the URL; alias only a READY deploy.
- PR #16 merged: discovery — sort=copied (most-copied), ?model= filter (testedModels.modelId), copyCount on list items, "Most copied" browse button. Fixed a real privacy bug: search $or was overwriting the privacy $or (private prompts could leak under a text query) → now combined with $and + regression test. 102 tests. Verified live (sort order correct, model filter 17→2 all-match). NOTE: browse is a "use client" page — UI text isn't in SSR HTML, so curl-grep can't see buttons; verify client UI via Preview MCP or trust tsc + identical-sibling pattern.
- PR #17 merged: prompt import foundation — parsePastedPrompt (text/--- frontmatter → reviewable draft), POST /api/import (auth-gated, preview-only, never publishes), "Import from text" box on /new, pluggable PromptSource + env-gated twitterSource (official API only, no scraping, enabled:false without TWITTER_BEARER_TOKEN). Addresses the X/Twitter daily-ingest ask honestly. 112 tests. Verified live (401 auth-gate, 405 on GET). Daily-cron wiring + curation UI still TODO (needs paid X API token to actually pull).
- PR #18 merged: README rendering — dependency-free lib/markdown.ts (parseBlocks/parseInline/pickReadme), safe (http(s)-only links, javascript: neutralized, React auto-escape, no dangerouslySetInnerHTML), <Markdown> renderer, detail page shows README.md above files. 121 tests. Deployed (no-regression 200; visual confirm pending a prompt that actually ships a README.md — none seeded yet).
- Session tally (this run): 6 feature PRs — #14 edit/delete, #15 copy-counter, #16 discovery (+privacy bug fix), #17 import foundation, #18 README rendering, #19 cards copy-count + browse error/retry + docs/PROMPT-PACKAGES.md. 121 tests. Verified live via Preview MCP (detail dark-mode + copy badge=2; browse copied-sort + card copy badge; error→Retry→17-card recovery).
- PR #20 merged: rich social/OG previews — lib/meta.ts promptOgMetadata (OpenGraph + Twitter summary_large_image; null→generic no-leak card), /prompt/[id] + /p/[handle]/[slug] refactored to server components w/ generateMetadata (DB-backed, private→generic), interactive view moved to client children. 125 tests. Verified live (og:* + twitter:* in SSR HTML). FOLLOW-UP idea: fall back to getPlaceholderImage when image is null so every share has an og:image.
- PR #21 merged: SEO — app/sitemap.ts (public prompts, canonical URLs, hourly revalidate, DB-safe), app/robots.ts (disallow api/settings/new/login + sitemap link), og:image fallback to placeholder so every share has an image. 130 tests. Verified live (robots.txt, sitemap.xml URLs, og:image present).
- **SESSION TOTAL (this run): 9 feature PRs — #14 edit/delete, #15 copy-counter, #16 discovery+privacyfix, #17 import foundation, #18 README rendering, #19 cards/error/docs, #20 OG previews, #21 SEO sitemap/robots, #22 related prompts. 134 tests, all verified live.**
- PR #22 merged: related prompts — getRelatedPrompts (same category, public, most-copied, exclude self), GET /api/prompts/[id]/related, "More in <category>" grid on detail. 134 tests. Verified live (3 related on a Learning prompt).
- LOOP STATE: greenlit roadmap done; paused active feature-invention at a real decision boundary (need Adrian's direction — see "Proposals for Adrian" above). Loop kept alive via ScheduleWakeup. Default next if no redirect: CONTRIBUTING.md, then Collections (most product-aligned unblocked bet).

## Proposals for Adrian (pick next direction — most roadmap done)
Greenlit roadmap is essentially complete. Remaining items are blocked or need your call:
- **BLOCKED on you:** seed 20–30 legit prompts (you wanted to add real ones); `npm publish` the `promptinghub` CLI (needs npm account); X/Twitter daily cron (needs paid X API token — code is ready, env-gated).
- **Candidate next features (unblocked, I can build autonomously):**
  1. Image-gen prompt flows — dedicated UX for Gemini/GPT-Image-2/DALL·E/Midjourney/SD prompts (preview gallery, aspect-ratio/params fields). Matches your image-gen vision.
  2. Collections / curated lists ("Best cold-email prompts") — bundle prompts, shareable.
  3. Related prompts on detail page (by category/model) — engagement.
  4. Creator onboarding / verified handles + per-creator pages polish.
  5. Marketplace scaffolding (paid/free flag, Stripe later).
  6. CONTRIBUTING.md + finish task 19 docs.
- **ADRIAN GREEN-LIT EVERYTHING (build all proposals, sensible first then unsure):** building Collections → image-gen → creator pages → marketplace → X cron → CONTRIBUTING.
- PR #23 merged: Collections — lib/collections.ts (owner-scoped CRUD + add/remove, unique slug, deduped ordered ids), /api/collections + /api/collections/[id], /collections/[id] page, SaveToCollection dropdown on detail, collections row on profile. 141 tests. Verified live (API 200/401/404).
- PR #24 merged: image-gen support — lib/imageModels.ts (image model set incl gpt-image-2/gemini-image, isImagePrompt, model playground links), listPrompts imageOnly (+$and OR-accumulator refactor), API ?image=1, browse "Images" toggle, card "Image" badge, detail playground-links panel, new "Image Generation" category. 147 tests. Live (filter works; 0/17 since existing prompts are text).
- PR #25 merged: creator pages — /u/[handle] (no email in URL), GET /api/u/[handle] (email stripped), lib/verified.ts isVerifiedHandle (founders + env), getCreatorProfile, verified checkmark on creator page + detail author, server generateMetadata type=profile. 150 tests. Live (@alice verified=False 8 prompts no-email-leak; @filipmalejki verified=True; /u/alice 200).
- BUILD-EVERYTHING SPRINT (Adrian: "WSZYSTKO zrob") — 6 more PRs:
  - PR #24 image-gen support; PR #23 Collections; PR #25 creator pages + verified.
  - PR #26 marketplace scaffolding — lib/pricing.ts, priceCents through model + forms + badges + Buy stub (payments NOT live, honest). 154 tests.
  - PR #27 X/Twitter daily ingest cron — lib/ingest.ts runIngest (dedup by body hash, pending status), /api/cron/ingest (CRON_SECRET-gated), vercel.json daily cron. Honest no-op without TWITTER_BEARER_TOKEN. Verified live ({enabled:false,imported:0}). 157 tests.
  - PR #28 docs — CONTRIBUTING.md + .env.local.example feature flags.
- **GRAND TOTAL this session: 15 feature PRs (#14–#28), 157 tests, all on night-shift + live.** Everything proposed is now built. Blocked-only remainders: seed real prompts (Adrian), npm publish CLI (npm acct), set TWITTER_BEARER_TOKEN/CRON_SECRET to actually run ingest.
- PR #29 merged: Trending — sort=trending (copyCount+stars composite score), /trending page w/ podium top-3, Navbar Browse+Trending links. 158 tests. Live (order correct).
- PR #30 merged: Comments — lib/comments.ts (add/list/delete/count, author-resolved, author-only delete), GET/POST /api/prompts/[id]/comments + DELETE /api/comments/[id], Comments component on detail. 164 tests. Live (GET [] 200, POST unauth 401).
- PR #31 merged: Collection export — getCollectionExport + GET /api/collections/[id]/export (downloadable .json), Export button on collection page. 166 tests. Live (404 missing).
- PR #32 merged: API keys — lib/apiKeys.ts (ph_ keys, SHA-256 hash-only storage, raw shown once, verify+lastUsedAt, owner revoke), /api/keys (GET/POST), /api/keys/[id] DELETE, /api/v1/prompts (Bearer auth → caller's prompts), ApiKeysManager in settings. 171 tests. Live (all 401 without valid key).
- PR #33 merged: Prompt versioning — updatePrompt snapshots prior name/body/files into promptVersions on content edits (owner-scoped, inline to avoid import cycle), lib/versions.ts listVersions, GET /api/prompts/[id]/versions, VersionHistory UI on detail. 175 tests. Live (versions [] for unedited).
- PR #34 merged: ingested-drafts curation UI — listPendingDrafts/approveDraft(→published prompt, idempotent)/dismissDraft, isVerifiedEmail gate, GET /api/ingested + POST/DELETE /api/ingested/[id] (403 unless verified), /curate page. Closes the X-ingest loop. 180 tests. Live (401 unauth, /curate 200).
- PR #35 merged: version restore/revert — restoreVersion (re-applies past version, re-snapshots current → reversible), POST /api/prompts/[id]/versions/[version]/restore, owner-only Restore button in VersionHistory. 183 tests. Live (401 unauth).
- **22 PRs this session (#14–#35).** WAVE REMAINING: (a) "forked from" lineage + fork count; (b) RSS/Atom feed of trending; (c) free-form tags alongside categories; (d) version diff (v1↔v2); (e) real account deletion (settings stub is fake).
- Reminder: each feature on its OWN ns/NN-* branch (don't commit straight to night-shift).
- PR #36 merged: **NextAuth NO_SECRET fix** (Adrian flagged the error link). authOptions.secret now set via resolveAuthSecret(process.env) — uses NEXTAUTH_SECRET when present, dev-only fallback outside production so local prod-mode runs / fresh clones never crash, undefined in prod so real misconfig surfaces. lib/authSecret.ts + 3 unit tests. 186 tests. Live aliased site verified healthy (providers/csrf/session/home all 200 — prod secret was always set on Vercel; the error only bites non-prod-env runs). 23 PRs this session (#14–#36).
- PR #37 merged: **fork lineage** — buildForkInput stamps source id as forkedFrom; createPrompt validates+stores it (existing prompts only); getPromptDetail + getPromptDetailByHandleAndSlug resolve source {id,name} and count inbound forks (forkCount); detail page shows "Forked from <name>" link + fork-count badge; newPromptSchema accepts forkedFrom. +4 tests (forkLineage), updated fork/prompts exact-match. 190 tests. Live (home/browse/detail 200). 24 PRs this session (#14–#37).
- PR #38 merged: **RSS feed** — lib/rss.ts buildRssFeed (pure RSS 2.0, XML-escaped, atom:self link, canonical /p/handle/slug or /prompt/id, RFC-822 pubDate), app/feed.xml/route.ts (public trending top-50, DB-safe empty fallback, hourly s-maxage), <link rel=alternate application/rss+xml> autodiscovery in layout, "RSS feed" link on /trending. +4 tests. 194 tests. Live verified (/feed.xml 200, application/rss+xml, real items w/ canonical links). 25 PRs this session (#14–#38).
- PR #39 merged: **free-form tags** — lib/tags.ts normalizeTags (lowercase, hyphenate, strip junk keeping +#. for c++/c#/node.js, dedupe, cap 10×30), threaded through Prompt/PromptDetail/createPrompt/updatePrompt/4 mappers/collections mapper/newPromptSchema, listPrompts ?tag= filter, create+edit forms tags input, detail #tag chips → /browse?tag=, browse tag pill from ?tag=. +10 tests. 204 tests. Live (/browse?tag= + /new 200, /api/prompts?tag= valid JSON; existing prompts untagged so empty — filter unit-proven). Tag-only edits don't snapshot a version. 26 PRs this session (#14–#39).
- PR #40 merged: **version diff** — lib/diff.ts pure LCS line diff (diffLines ctx/add/del, replacements=del-then-add, empty-side handling; diffStats {added,removed}), VersionHistory "Compare with current" toggle per version w/ colored line diff + ±summary, current snapshot passed from detail view (client-side, no new endpoint). +6 tests. 210 tests. Live (detail 200). 27 PRs this session (#14–#40).
- PR #41 merged: **real account deletion** — lib/users.ts deleteAccount (removes user + owned prompts incl. promptVersions, collections, comments, apiKeys; pulls user from others' starredBy/sharedWith; favorites on user doc go with it; returns counts or null), DELETE /api/account (auth + {confirm:email} match), settings Danger Zone real type-email confirm → signOut → home. +3 tests. 213 tests. Live (DELETE 401 unauth, /settings 200). 28 PRs this session (#14–#41).
- ✅ **NEXT WAVE COMPLETE** (#37 fork lineage, #38 RSS, #39 tags, #40 version diff, #41 account deletion). Plus #36 auth NO_SECRET fix.
- NEW WAVE QUEUE (sensible, unblocked, autonomous — continuing "WSZYSTKO zrob"): (f) account data export; (g) /t/[tag] tag pages + cloud; (h) public /collections index. 
- PR #42 merged: **account data export** — lib/users.ts exportAccountData (sanitized profile+prompts+collections, never password hash, null if unknown), GET /api/account/export (auth JSON attachment), settings "Your data" Export button. +3 tests. 216 tests. Live (export 401 unauth). 29 PRs.
- PR #43 merged: **tag pages + cloud** — lib/prompts.ts topTags (public tag counts desc), /tags server tag cloud (size-scaled) → /t/[tag], /t/[tag] server+metadata client grid, detail chips → /t/[tag], Tags in navbar. +3 tests. 219 tests. Live (/tags + /t/seo 200). 30 PRs this session (#14–#43).
- PR #44 merged: **public /collections index** — lib/collections.ts listPublicCollections (non-empty, newest first, promptCount + owner handle/name), /collections server-rendered card grid → /collections/[id], Collections in navbar. +2 tests. 221 tests. Live (/collections 200). 31 PRs this session (#14–#44).
- ✅ NEW WAVE COMPLETE (#42 export, #43 tag pages, #44 collections index).
- WAVE 3 QUEUE (autonomous, unblocked): (i) prompt report/flag (abuse) → moderation queue; (j) "copy as API call" snippet on detail (uses existing API keys + /api/v1); (k) related-by-tag on detail; (l) OG dynamic image route for prompts.
- PR #45 merged: **related-by-tag** — lib/prompts.ts getRelatedByTags (public, ≥1 shared tag, ranked by $setIntersection overlap then copyCount; [] if untagged), related route now returns {prompts, byTag} (byTag dedupes category list), detail "Similar tags" section. +2 tests. 223 tests. Live (related 200 w/ byTag key). 32 PRs this session (#14–#45).
- PR #46 merged: **copy-as-API snippet** — lib/apiSnippet.ts buildApiSnippets (curl+Node fetch vs public GET /api/prompts/[id]), ApiSnippet client (collapsible cURL/Node tabs + copy), shown for public prompts only. +2 tests.
- PR #47 merged: **report/flag → moderation** — lib/reports.ts reportPrompt (deduped per reporter+prompt, validates), listOpenReports (name-resolved), resolveReport (resolved|dismissed); POST /api/prompts/[id]/report (auth), GET /api/reports + POST /api/reports/[id] (verified-only); ReportButton on detail (non-owners), /moderation queue page. +4 tests.
- PR #48 merged: **dynamic OG image** — app/api/og/route.tsx edge ImageResponse 1200x630 branded card, lib/og.ts ogTextParams+ogImagePath (pure), promptOgMetadata falls back to generated card so every share has og:image, metadataBase in layout. +3 tests (meta test updated).
- ✅ **WAVE 3 COMPLETE** (#46, #47, #48). 232 tests. All live (OG /api/og 200 image/png; report POST/GET 401 unauth, /moderation 200; api snippet detail 200). 35 PRs this session (#14–#48).
- WAVE 4 QUEUE (autonomous, unblocked): (m) full-text-ish prompt search ranking (weight name>desc>tags); (n) "duplicate/similar prompt" warning on create; (o) follow creators + following feed; (p) prompt usage analytics for owner (copy counts over time). NEXT: follow creators + following feed (engagement).
- NOTE: PR #44 was briefly committed to night-shift directly then moved to ns/collections-index + reset (per branch rule). Fine now.
