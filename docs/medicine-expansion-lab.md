# Medicine identity and expansion lab

## Result

Medicine has a persistent Clinical teal / Warm coral switch across its landing page, dashboard, research lab and interview shell. The clinical identity follows the supplied handoff; live interview timers use calm aqua in both schemes.

The admin Medicine portal opens on the new expansion lab. It combines a build journal, source-linked school research, original staged exercises, reviewer notes and manual timed circuits.

## Routes

- `/medicine`: public Medicine landing page and colour comparison.
- `/admin/medicine-lab`: admin-gated research and rehearsal page.
- `/admin/medicine-portal`: existing portal, now with an Expansion tab.
- `/__dev/medicine-lab`: development-only local preview; omitted in production.
- `/__dev/medicine-design`: development-only preview of the real dashboard views using isolated illustrative data, with example, empty and loading states.

## Content and evidence

- 60 original draft stations: 35 academic-track, 38 MMI-track, 13 shared.
- Each draft has two follow-ups, suggested reasoning and three assessment bands.
- Drafts are in `src/data/interview-staging/medicine-expansion.json`, outside the runtime question bank and both edge-function banks.
- 68 inherited course routes are searchable. Nine priority routes have refreshed format evidence; remaining notes are labelled as awaiting refresh.
- 18 official source records retain access limitations, dates and claim scope.
- Oxford, Cambridge and Imperial are founder priorities, not a claimed national selectivity ranking. Admissions rows preserve cycle, course and population. Imperial’s applications/places ratio is not an offer rate. Edinburgh’s conflicting offer totals are flagged and no overall percentage is derived.

## Manual circuits

Oxford, Cambridge, Imperial and mixed MMI practice plans assemble eligible distinct drafts from a shared bank. A seeded backtracking allocator respects track, topic, difficulty and explicit history exclusions. It reports shortages instead of recycling excluded content. Timers model reading, response and optional transitions. Profiles clearly distinguish published timing from editorial practice choices.

Review notes, theme preference and practice history are saved in this browser only. Plans and reflections can be exported. The coverage panel shows topic depth and demonstrated no-repeat circuit sequences. Full editorial packs export as JSON or readable Markdown, including prompts, guidance and local notes. The manual lab does not make paid avatar calls or generate AI assessments. Draft review decisions do not publish content: publication remains a reviewed merge through the existing content workflow.

## Local check feed

The Vite development plugin exposes a loopback-only, same-origin runner with three fixed commands: content checks, TypeScript checks and the focused medicine regression suite. It accepts no arbitrary shell command. Process output and completion codes appear in the lab. This service is absent from production; the deployed admin page shows the saved research edition.

## Validation at milestone

- 26 tests passed across five medicine/UI test files, including runtime isolation, distinct station allocation, exclusions, reproducibility, difficulty, transition totals, countdown deadlines and honest school-mode descriptions.
- `node scripts/check-medicine-expansion.mjs` passed for all 60 drafts and the sourced priority metrics.
- TypeScript app check passed.
- Direct Vite production build passed. Existing large-chunk and old browser-data warnings remain.
- Browser checks at 1440px and 390px covered theme persistence, notes, filters, timers, circuit completion, exported self-assessment, no-repeat history and evidence search; no page exceptions or horizontal overflow.
- All five dashboard preview tabs passed desktop/mobile checks, including new-account and loading states.

The progress chart uses the supplied area/line presentation and leaves missing scores as gaps. The live countdown now uses an elapsed-time deadline, survives parent rerenders and fires completion once. It does not change the configured session allowance.

## Engine expansion follow-up — 16 September

The engine expansion replaces the 25-minute Medicine caps with full-plan application budgets and adds Oxford, Cambridge and Imperial admin pilots, an interactive engine workbench and twelve scripted diagnostics. See [medicine-engine-expansion.md](medicine-engine-expansion.md) for implementation, verification and required backend deployment order. A deployed live avatar/model acceptance run and content review remain open.

For a second local Vite preview alongside port 8080, set `MEDICINE_LAB_PREVIEW=1` to use an isolated dependency cache. This avoids stale dependency errors between preview servers.

Authenticated student sessions and paid live calls were not started. The new academic and Imperial profiles are integrated behind server-side administrator authorization. They remain draft pilots pending deployment, acceptance testing and human review.
