# Interview quality and reliability — 2 October 2026

## What changed

- Medicine follow-ups explicitly connect to the candidate's last claim or example. An off-topic answer should receive a neutral redirect, without stock praise. Non-clinical work, volunteering, caring and school experiences remain valid material for reflection.
- Ending a station no longer lets a model mark an already-recorded answer as never attempted. Explicitly skipping after answering retains that reasoning in the assessment log and displays **Moved on early** in the review.
- All 15 active engine types use one structured assessment request for scores, supporting quotes, concise coaching and up to six relevant highlights. The previous pipeline made separate scoring, annotation and improvement requests and applied language-exam annotations to Medicine.
- Every numerical skill score needs an exact quote from a candidate answer. Unsupported skills become **Not assessed**; a total is shown only when all four skills have evidence. The server computes totals. A quote establishes provenance, not independent validation of the model's judgement.
- Task clarification, simple audio checks and explicit stop requests are excluded from the assessment input and cannot be highlighted or used as scoring evidence. Their text remains in the saved transcript.
- Failed assessment persistence returns a retryable error instead of false success. Refused, empty and truncated model responses also preserve the transcript and return a retryable error.
- Evidence quotes expand under each skill. Transcript highlights are clickable, work with keyboard/touch and preserve multi-paragraph answers. Highlights never assess the interviewer's words.
- Candidate briefs and Oxford/Cambridge reasoning pads remain available when the transcript is hidden. The brief comes before the video on phones. Starting an answer ends reading time; **I'm ready** starts the full answer budget early without allowing repeated resets.
- Colour choices sit in the interview toolbar. Live testing caught the old floating selector blocking response replay. Transcript scrolling now stays inside its card.
- The connection indicator checks this site instead of Google's favicon. A slow successful check is no longer labelled offline.
- The alternative 11+ voice mode now retries the same operation identity at most twice, queues station controls, discards replies after stopping and retains feedback for retry. Ordinary 11+ and Medicine continue sharing the underlying interview engine.

## Research and rationale

Leeds describes written station instructions and allows candidates to ask for rephrasing. This supports retaining the public brief and keeping clarification separate from assessed answers. [University of Leeds](https://medicinehealth.leeds.ac.uk/medicine/doc/preparing-mmi)

The Medical Schools Council describes MMI stations testing particular attributes and semi-structured questions that develop from candidate responses. This informs the same-station follow-up design; it does not establish an official question sequence or validate our scores. [Medical Schools Council](https://www.medschools.ac.uk/for-students/applying-to-medical-school/interviews/)

Cambridge's official indexed guidance describes academic conversations exploring thinking and unfamiliar ideas. Its direct page returned 403 during this check, so this is indexed-source verification only. Oxford/Cambridge practice remains academic rather than a universal MMI circuit. [Cambridge interviews](https://www.undergraduate.study.cam.ac.uk/apply/after/cambridge-interviews)

Structured outputs constrain assessment shape; exact student-quote checks and nullable scores add application checks. Refusals and incomplete responses need separate handling. [OpenAI structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs)

Provider errors showed a shared 30,000-token/minute limit. Some errors supplied a wait inside their JSON message without a Retry-After header. Retries now honour that explicit wait within the existing request deadline; long holds and exhausted billing quota are not retried in a tight server loop. This improves recovery but does not increase account capacity. [OpenAI rate limits](https://developers.openai.com/api/docs/guides/rate-limits)

## Verification

- **294 application tests and 144 backend tests pass.** Coverage includes evidence grounding, nullable scores, clarification exclusion, answered-then-skipped evidence, save failures, refusal/truncation, timer starts, bounded retries, transcript spans and connection status.
- TypeScript, the production build and Deno checks for changed functions pass. Supabase readiness checks pass for sessions, question metadata, orders, attempts and the three existing transaction operations.
- Live baseline conversations covered all 15 active engine types: four focused Medicine modes; Leeds and Manchester; Oxford, Cambridge and Imperial; 11+ and alternative 11+; logic, maths, current affairs and friendly chat.
- The baseline included deliberately thin answers. An early helper also truncated some authored reasoning to its first character; those runs are failure/uncertain-answer checks, not realistic strong-candidate evaluations. The release helper corrected this, with synthetic answer fixtures and saved transcript review.
- Real guest Anam testing passed avatar video, typed answers, a same-station follow-up, written briefs, focus mode, phone layout and saved assessment. The reported swimming-pool sequence was rechecked with its full role and scenario followed by an explicit bridge into the next station.
- Oxford passed real Anam audio/video, keyboard answers, reasoning notes, focus mode, replay, 320px/390px layouts, colour switching and feedback. An injected feedback outage preserved a downloadable transcript; retry saved a real assessment. Leaving closed WebRTC and preserved completed session status.
- Cambridge passed real Anam audio/video, prerecorded synthetic microphone speech through Anam transcription, reasoning notes, focus mode and saved academic feedback. No browser runtime errors were observed in the completed Oxford/Cambridge runs.
- Final ethics, roleplay and data rechecks passed against the deployed functions, including saved assessment and exclusion of clarification quotes. The two initial release checks affected by provider rate limits were rerun successfully. This completes at least one successful live engine-and-feedback check for each of the 15 types.
- The ordinary 11+ browser journey passed sign-in, selection, charging exactly three credits, real Anam audio/video, prerecorded synthetic microphone speech, two further typed answers, profanity masking, mobile layouts and saved school feedback. An injected feedback outage preserved a censored transcript download and recovered on retry. The call closed cleanly with no browser runtime errors.
- Temporary QA users, admin entries and trial invitations were removed. No real candidate transcripts or account identifiers are included in this report.

These are short functional checks and transcript reviews. They do not establish every possible model response, full-duration audio reliability, heavy concurrent-load capacity, or educator validation of every question and score. Original practice material remains distinct from official university interviews.

## Release and review locations

The changed `interview-brain` and `generate-interview-feedback` functions are deployed to the existing Supabase project. No schema migration is needed; existing score columns already allow null.

The release journal and source ledger are in **Admin → Medicine → Expansion lab** (`/admin/medicine-lab`). Candidate assessments remain under their interview feedback, with founder assessments and tester comments separately labelled in the existing guest feedback inbox.

The frontend still requires **Lovable → Publish → Update** after GitHub sync. Publishing capability was not available in this session. Backend improvements are already active.
