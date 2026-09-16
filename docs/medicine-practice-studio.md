# Medicine practice studio — product milestone

16 September 2026. This extends the existing Medicine product; it does not deploy the school pilot backend or change billing.

## Student experience

- `/medicine`: the same React landing page in Clinical teal and Warm coral. A real, existing practice prompt replaces the image placeholder. Visitors can try an opening answer and reveal a self-review guide without creating an account. A focus selector links directly into the relevant studio library.
- `/medicine/practice`: free solo practice with a plan, library, reflections and experience journal. Also available in the signed-in dashboard's Practice tab. Live circuits remain a separate choice using the existing launch path.
- 48 explicitly selected existing prompts across motivation, teamwork, professional judgement, ethical reasoning and evidence/data. The subset excludes actor scripts, current-affairs items, clinical-review flags and clinical-action prompts identified during this build. New Oxford/Cambridge/Imperial drafts are not imported or published.
- A 45-second optional reading phase and 2/3/5-minute response budgets, plus untimed mode. These are editorial practice settings, not representations of a school's exact interview.
- Typed answers, authored follow-ups, a thinking hint, browser prompt read-aloud, a focus view and a compact phone timer. A review guide becomes available after the attempt. The user selects their own confidence, records a reflection and writes one next step. No AI score is generated.
- Optional microphone recording through the browser's MediaRecorder. Explicit request, playback, download, removal, ten-minute cap and cleanup on exit, cancellation and unmount. No audio upload or automatic transcription. Audio is not included in saved reflections or backups.
- A revisit queue prioritises due questions, then fresh prompts with topic variety. Confidence schedules a revisit after 1/3/7 days; these are transparent editorial intervals, not a validated learning model. Weekly activity counts days with a saved reflection, not raw clicks.
- Personal experiences capture situation, action, outcome and learning, tagged by skill. Learners can edit, remove and export them, then open practice for a related skill. This is a journal, not an automated personal-statement or interview-answer generator.
- A two-week `.ics` calendar with 3/5/7 days per week and an optional interview date cutoff. All-day entries can be moved in the user's calendar. No calendar integration, account access or sent reminders.
- JSON backup export and validated merge restore, with preview and optional plan restoration. Duplicate attempt IDs are not duplicated; the latest experience revision wins. Signed-in users can explicitly copy a guest profile on the same browser.

## Data and privacy

`intrvue:medicine-studio:v1:<scope>` stores the plan, up to 100 reflections, 30 experiences and bookmarks in localStorage. The account id is only a local namespace. Guest and design-preview data have separate namespaces; mounting is keyed to the current account. Notes do not sync to Supabase or between devices. Cross-tab storage events update the visible profile; each save also reads the latest stored state. Simultaneous writes in different tabs are still best-effort localStorage, not a database transaction.

Imports are capped at 2 MB, parsed with the versioned Zod schema, and rendered as text. No markup is evaluated. The account's current plan is preserved unless the user explicitly selects restoration. A storage failure leaves the current data in memory and displays an export reminder. Clearing a profile requires a deliberate confirmation and leaves other namespaces alone.

No studio analytics or conversion events are sent. Existing app infrastructure still loads normally; the new studio makes no AI/provider/payment calls. Recordings exist as temporary blob URLs and are revoked on disposal. Prompt read-aloud uses browser speech synthesis; only the public prompt is read.

## Content boundaries

`src/interview/studio/bank.ts` has a positive set of 48 question IDs, plus runtime topic/rubric/expiry/review checks. Explicit selection is necessary because some existing clinical scenarios have no `clinicalReviewRequired` flag. The studio does not import the roleplay or current-affairs JSON directories. Content is sourced from the repository's existing bank, not the new draft collection.

This is a static bundled subset. Changes or retirements made only in a remote content table do not automatically update it; update the source and release list together. Tests reconcile every selected ID with the eligible source bank. Current self-review guides are existing editorial material, not a new claim of educator or clinical validation.

## Growth workbench

The admin lab includes an interactive scenario at `#growth-workbench`, with export. Inputs: monthly revenue goal, revenue per learner, AI minutes, blended AI minute cost, variable fee percentage, fixed costs, churn and visitor conversion. It shows required paying learners, contribution, fixed-cost coverage and acquisition needed merely to replace churn.

At the illustrative defaults, £100,000/month at £49 requires 2,041 paying learners. This is arithmetic, not a forecast or an implemented subscription. Medicine circuits currently cost **zero credits during early access**. The wider platform's credit store is not a Medicine subscription. No checkout amounts, products or charging rules were changed.

The model excludes taxes, refunds, acquisition spend and any costs not entered. Actual supplier costs, seasonal retention and willingness to pay need measurement. The page distinguishes shipped first-use/return features from unconnected analytics, cloud sync and live payment acceptance.

## Research and product decisions

Checked 16 September 2026:

- [Medify Interviews](https://medify.co/interviews): spoken/typed practice, question bank, feedback and progress. This establishes a competitor feature baseline; its marketing claims are not independent outcome evidence.
- [Interviews Ninja](https://interviews.ninja/): peer practice and feedback. A useful adjacent model; this build does not introduce peer matching.
- [Roediger & Karpicke, Test-Enhanced Learning (2006)](https://www.psychologicalscience.org/journals/psychological-science/j.1467-9280.2006.01693.x/): retrieval and long-term retention. Attempt-before-guide and planned revisits are design inferences from this work, not demonstrated admissions benefits.

Implementation prioritises a first useful attempt before signup, a concrete next action, transparent self-reflection and a path into spoken practice. There are no invented testimonials, admissions success rates, customer counts or revenue numbers.

## Engineering

- The public studio is a lazy route; the dashboard lazily loads the same implementation. It imports only relevant Medicine topic directories, rather than the all-subject loader.
- Timer callbacks use current refs and wall-clock deadlines. Permission requests are invalidated on cancellation/unmount, including a microphone grant arriving after the room closes.
- Focus mode supports Escape and keyboard containment. Tabs support arrow keys/Home/End. Phone layouts support 320px widths. Secondary Clinical text was darkened after contrast testing.
- Medicine sign-in and the Medicine dashboard no longer show the legacy 11+ cycle shutdown banner. Product switches update this state without changing the 11+ announcement.
- Vite now waits briefly for file writes to settle. Without this, a formatter could cause a transient empty module to be cached in the Windows preview. This fixes the observed missing dashboard export during development.
- The local lab's fixed test command now includes the studio model and hook tests, retaining existing engine/content checks. No arbitrary shell command endpoint was added.

## Release checks

129 regression tests passed in 17 files (33 new studio/entry tests alongside 96 existing checks). Source integrity, TypeScript, selected-module lint and the production build passed. Browser checks completed recording/playback/cleanup, question practice, reflections, story and calendar exports, valid/invalid backup import, reload persistence, four tabs at 320/390px, dashboard integration and the growth model. Ten scoped axe scans found no WCAG A/AA violations in the inspected views. A separate smoke check completed the built production bundle’s landing → studio → reflection → history journey. Automated checks do not establish educational effectiveness or replace live AI/pilot acceptance.

The earlier school pilot migration/deployment requirements in `docs/medicine-engine-expansion.md` remain applicable. This frontend milestone needs no new database migration. No remote backend deployment, actual payment, external message or paid AI/avatar session was performed for this build.

## Next commercial evidence to collect

1. Connect privacy-reviewed event collection for studio open → attempt start → reflection saved → return practice → live circuit start/completion. Keep answers and recordings out of analytics. Separate guest sessions, authenticated learners and payment events.
2. Observe real first-session completion and seven-day return rates with an invited cohort. Compare timed and untimed starts, and whether the revisit queue leads to another attempt.
3. Measure provider minutes/cost per completed circuit and failure/refund rates after the pending live backend acceptance.
4. Test Medicine pricing and seasonal retention with real users before enabling a charging model. Revenue does not follow from feature count alone; use the workbench to make those assumptions explicit.
