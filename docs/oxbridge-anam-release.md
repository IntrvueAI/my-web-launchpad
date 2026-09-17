# Oxford, Cambridge and Anam experience update

17 September 2026

Oxford and Cambridge now have a dedicated academic interview prompt and a reasoning pad beside the live Anam interviewer. Both have completed real browser-to-Supabase-to-Anam conversations, followed by saved AI feedback. The school profiles remain administrator-only pilots using original draft material.

## What changed

- **Academic follow-ups:** explore the candidate's mechanism, assumptions, competing explanations and a way to test them. Follow-ups ask one question at a time; presenting a new exercise preserves its authored facts, units and full prompt.
- **Current exercise:** the candidate can read the exercise beside the avatar. The server returns only its identifier, topic and prompt. Private answers, hints and marking guidance stay on the server.
- **Reasoning pad:** optional notes for an explanation, evidence/assumptions and what would change the candidate's mind. Notes remain in session memory until the candidate explicitly sends them as an answer; sent notes join the transcript.
- **Microphone check:** an eight-second local meter with permission guidance and a cancel control. It creates no avatar session and makes no recording or upload. All microphone tracks close on completion, cancellation or leaving the page.
- **Recovery:** the latest spoken response can be replayed without advancing the engine. A disconnected interview retains its transcript and offers feedback recovery.
- **Connection lifecycle:** duplicate starts are ignored, stalled stream setup has a 45-second deadline, and late connections are closed after cancellation. Failed session persistence prevents an unnecessary provider session.
- **Saved work:** answers entered during the opening greeting are retained. Diagnostic logging cannot block microphone shutdown. Leaving the page cannot overwrite a completed session with an error status.
- **Feedback recovery:** a failed scoring request retains a visible, downloadable transcript and an explicit retry button. Retrying keeps the original session reference and does not start another avatar call. Connection failures also allow another start attempt.
- **Phone controls:** live controls wrap, typed answers fit narrow screens, and both colour schemes remain reachable through compact swatches. Typing mode clearly labels the microphone as muted.
- **Continuous checks:** GitHub now runs the application tests, backend tests, types, database checks and production build for interface and service changes as well as engine changes.

## Evidence

| Check | Result |
| --- | --- |
| Application regression suite | 223 tests across 25 files passed |
| Backend handler suite | 60 tests passed, including candidate exercise privacy |
| Changed edge functions | Deno type checks passed |
| App types and production bundle | Passed |
| Draft content integrity | 60 drafts, 35 eligible for academic practice; all remain outside the 122-question published bank |
| Oxford live browser | Real Anam video/audio, early typed answer, reasoning notes, feedback, completed saved session and closed WebRTC connection |
| Cambridge live browser | Real Anam video/audio, synthetic microphone speech transcribed into an engine answer, reasoning notes, feedback and clean shutdown |
| Microphone preflight | Meter, cancellation, permission denial and track cleanup passed without provider calls |
| Phone layouts and colours | Active interview fit 320px and 390px; both live palettes switch correctly |
| Complete live engine circuits | Both schools completed all four planned exercises, including skips, time limits and repeated timer delivery |
| Stored feedback | Both full engine circuits saved feedback with the four academic scoring dimensions |
| Feedback outage recovery | An injected HTTP 503 left a downloadable transcript; user retry called the real backend and saved exactly one feedback record |

The live calls received decoded avatar video (576 × 384 to 1152 × 768) and non-zero incoming audio energy. All temporary accounts, administrator entries and test data were removed. One initial full-circuit feedback request returned HTTP 500; subsequent complete Oxford and Cambridge runs saved feedback successfully. Its exact server error was not captured, so this is not a claim that provider failures are eliminated. The interface now preserves work and offers an explicit recovery path.

Synthetic microphone speech verifies the speech-to-answer path; it does not establish quality across human accents, noisy rooms or all devices. The full engine circuit checks deliberately exercise skip and time-up controls. Full-length 36-minute avatar sessions and educator assessment validity have not been established by these acceptance calls.

## Deployment

The updated `interview-brain` and `generate-interview-feedback` functions are deployed to Supabase project `fjkuuzfuysemrofcmnvd`. No additional migration is required for this batch. The earlier three migrations and Anam-only backend release are recorded in [the backend release](supabase-backend-release.md).

Use **Admin → Medicine interviews** (`/admin/medicine-interviews`) for the live school pilots. The local testing page (`/__dev/medicine-lab`) contains the progress journal, actual test output and deterministic rehearsal tools. The rehearsal tools themselves do not call an AI model.

The public frontend was still serving an older bundle during this release check. Syncing GitHub does not publish the new interface. In the connected Lovable project, use **Publish → Update**, then verify the published URL. This is Lovable's documented publishing flow: [Publish your project](https://docs.lovable.dev/features/publish).

## Research behind the academic format

Oxford describes interviews at two colleges with potentially different interview formats. A universal fixed MMI format is therefore not assumed. [Oxford A100 application process](https://www.medsci.ox.ac.uk/study/medicine/pre-clinical/applying/application-process).

Cambridge's criteria include applying sixth-form science to unfamiliar problems, forming hypotheses, considering alternatives and revising interpretations. The academic prompt and reasoning pad are our practice design based on those criteria; they are not official university materials. [Cambridge medical admissions criteria](https://www.undergraduate.study.cam.ac.uk/sites/default/files/publications/key_criteria_for_medical_admissions.pdf).

The provider lifecycle uses documented Anam connection and conversation events. [Anam SDK events](https://anam.ai/docs/javascript-sdk/reference/event-types). Existing SDK compatibility was verified against the installed package and real calls; the SDK major version was not changed.

Official indexed Oxford/Cambridge text and the Anam/Lovable documentation were checked on 17 September 2026. Direct retrieval of some university pages remained restricted; the source ledger preserves that distinction. Editorial review is still required before releasing the draft questions publicly.
