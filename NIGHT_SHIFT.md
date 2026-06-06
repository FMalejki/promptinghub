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

### Phase 1 — Core prompt depth
- ⬜ 1. Prompt detail page `/prompt/[id]` + `GET /api/prompts/[id]` (full body, copy button)
- ⬜ 2. Multi-file prompt model: `files: [{path, content, language}]` (body → single-file fallback)
- ⬜ 3. Detail page renders multiple files w/ language label + per-file & copy-all
- ⬜ 4. Upload UX: drag-and-drop + multi-select files, infer language from extension, preview

### Phase 2 — Customization / templating
- ⬜ 5. Variable extraction: parse `{{var}}` / `{{var:default}}` → `extractVariables()`
- ⬜ 6. Detail page: fillable inputs per variable, live substitution, copy filled result
- ⬜ 7. Fork/customize: logged-in user forks a prompt with their values as a new prompt

### Phase 3 — Namespacing & install
- ⬜ 8. User handles `@handle` + per-prompt slug → canonical `/p/owner/slug`
- ⬜ 9. Install/use: copy command + manifest endpoint (downloadable bundle/JSON)
- ⬜ 10. Prompt metadata: model/tool tags (Gemini, GPT-Image-2, Claude…), README

### Phase 4 — Discovery & pool
- ⬜ 11. Seed 20–30 real prompts + `public` flag + seed script
- ⬜ 12. Tag/model filters, sort (newest/popular)
- ⬜ 13. Stars/likes + counts
- ⬜ 14. Copy/usage counter

### Phase 5 — Polish
- ⬜ 15. Landing page explaining the product (replace bare redirect)
- ⬜ 16. Profile shows a user's prompts
- ⬜ 17. Edit/delete own prompts
- ⬜ 18. Empty/loading/error states, responsive pass
- ⬜ 19. Repo README + CONTRIBUTING
- ⬜ 20. Full E2E click-through verification

## Progress log
- (setup) night-shift branched off main; Vercel CLI authed (project promptinghub); 24 baseline tests green.
