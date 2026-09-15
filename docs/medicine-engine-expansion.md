# Medicine interview engine expansion

## Delivered

Three administrator-only profiles use the shared interview brain:

| Profile | Original practice plan | Application session cap | Guidance |
| --- | --- | --- | --- |
| Oxford | Four exercises, eight minutes each | 36 minutes | Scientific mechanisms, assumptions, evidence and reflection |
| Cambridge | Four exercises, eight minutes each | 36 minutes | Competing hypotheses, discriminating experiments and revising explanations |
| Imperial | Six exercises, five minutes each | 35 minutes | Motivation, teamwork, communication, ethics, data and professional judgement |

Oxford/Cambridge counts and durations are editorial practice choices. Imperial publishes five-minute answers; six exercises and zero reading time are our choices. No university affiliation, exact-question reproduction, official scoring equivalence or admissions prediction is claimed.

The browser and avatar request use a budget derived from the complete practice plan, plus three minutes for opening/closing and fifteen seconds per station for overhead. Existing Leeds and Manchester caps increase from 25 to 69 and 45 minutes. Manchester's published two-minute inter-station gaps remain omitted and are disclosed in setup. Natural completion and bounded follow-ups may end a session earlier.

### Content and release boundary

- All 60 new questions remain drafts outside the published 122-question Medicine bank.
- Alex, Sam, Jo and Riley have full actor instructions: conditional disclosures, emotional changes, resistance, realistic endings and red flags.
- The server verifies administrator access before allowing a pilot brain or its avatar token. Hidden navigation and tester passcodes are not the access boundary.
- The server persists an ordered plan, excluding questions asked in the account's last 30 pilot sessions across schools. Insufficient coverage returns a shortage instead of silently repeating or substituting unrelated questions.
- Academic feedback uses Scientific Reasoning, Evidence & Uncertainty, Communication & Clarity, and Reflection & Adaptability. Pilot results remain outside the existing student Medicine dashboard aggregates.

### Reliability

- Station deadlines survive follow-ups, changing callbacks and delayed browser ticks; bells fire once.
- Station controls queue behind in-flight answers. A station index rejects stale events after an answer advances.
- Stopped clients ignore late replies. Server revision checks prevent concurrent writes overwriting newer evidence or completed sessions.
- Answer retries keep the same turn identifier; an already processed turn returns its saved result.
- Stop, skip, timeout, bank exhaustion and follow-up limits work when the model omits tool calls. Missing assessment remains `incomplete`, without an invented grade. Completion reasons are recorded separately.
- Unknown tools, assessing a freshly fetched unanswered question and continuing after completion are rejected.
- Database mapping preserves actor, format, clinical-review and expiry fields. Malformed expiry dates are withheld. Database retirement is respected, including an entirely retired subject bank.
- Metadata restoration only matches known unchanged prompts. The migration inserts or activates no questions and preserves existing non-null metadata.
- Session cleanup no longer abandons every session older than 90 seconds. Recent activity protects long circuits; the live client sends a heartbeat.

## Lab and administration

Open `/__dev/medicine-lab#engine-rehearsal` locally, or the expansion lab in the Medicine admin portal. The workbench supports all three profiles, authored probes, repeat, skip, timeout, end, an optional real clock, transcript/evidence export and explicit local history reset.

The workbench uses a deterministic scripted adapter. It does **not** call an AI model, assess answers, or simulate actor response quality. Its twelve diagnostics execute the actual shared sequencing engine. Use `/admin/medicine-interviews` for authenticated AI pilots after backend deployment.

Edition 03 of the journal records completed work and release limits. The terminal runs the expanded regression suite and displays actual process output.

## Verification — 16 September 2026

- 96 focused tests passed in 14 files: engine, controls, React timer/session lifecycle, question selection, school profiles, content isolation and existing Medicine UI. Profile coverage was exercised over 100 seeds per school.
- Twelve browser diagnostics passed. Desktop/mobile checks covered all profiles, probes, repeat, timeout, skip, stop, exports and both palettes, without page errors or horizontal overflow.
- App TypeScript, selected-module ESLint, Deno checks for the three changed edge functions, and the Vite production build passed. Existing large-bundle and outdated browser-data warnings remain.
- Local PostgreSQL migration execution via PGlite passed syntax, default revision, actor restoration, retired-state preservation, edited-prompt protection, repeated application and preservation of admin metadata.
- Content integrity checks passed for all 60 drafts and the source ledger.

## Deployment and acceptance still required

Apply `supabase/migrations/20260916000001_medicine_engine_reliability.sql` **before** deploying `interview-brain`. Then deploy `interview-brain`, `get-anam-session-token`, and `generate-interview-feedback` together. The new brain requires `engine_revision`; deploying it first will fail session loading. Regenerate shared code with `node scripts/build-interview-brain.mjs --code-only` for engine/pilot changes, preserving unrelated published-bank edits.

No remote migration, edge deployment, paid model evaluation or live avatar session was performed. Before release, verify administrator/ordinary-account rejection, a complete live circuit, real model/actor quality, concurrent-session rejection, and the avatar account's supported duration. Scripted checks establish engineering behaviour, not assessment validity. Educator/editorial review remains required before publishing the drafts.

## Primary evidence

- [Oxford A100 application process](https://www.medsci.ox.ac.uk/study/medicine/pre-clinical/applying/application-process): two colleges, variable interview structure. Official indexed text checked 15 September; direct retrieval returned 403.
- [Cambridge medical admissions criteria](https://www.undergraduate.study.cam.ac.uk/sites/default/files/publications/key_criteria_for_medical_admissions.pdf): scientific application, hypothesis formation, flexibility and reflection. Official indexed PDF text checked 16 September; direct retrieval returned 403.
- [Imperial MMI admissions](https://www.imperial.ac.uk/medicine/study/undergraduate/medicine-mbbs-programmes/mmi/): five-minute answers and separate content/communication marks. Official page retrieved in the source research and rechecked against indexed text.
- [Manchester interviews](https://www.bmh.manchester.ac.uk/study/medicine/apply/interviews/): five eight-minute stations, two-minute gaps and no advance reading. Checked 15 September.
- [Anam session duration](https://anam.ai/docs/personas/session/duration): duration starts with streaming; account-plan limits also apply. Checked 15 September; this account's plan was not inspected.
