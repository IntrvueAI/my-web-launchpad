# Medicine station coaching and timing — 5 October 2026

## What changed and where to find it

- **Practise → 5-minute stations:** ethics, communication, motivation and data now provide 60 seconds to read, followed by 300 seconds to answer. “I’m ready” starts the full answer allowance early. Speaking or typing early also uses the existing early-start behaviour.
- **During Medicine interviews:** a large clock remains at the top while the candidate scrolls. It names the current phase and station. The final response minute shows a banner, screen-reader announcement and optional chime. Reading-time completion has a separate chime. The sound button can mute these cues. These sounds do not add interviewer words to the transcript.
- **Immediately after a focused station, and in saved feedback:** a three-step answer structure appears beside the assessment. Ethics, roleplay and data can also show “You said”, “A possible stronger version” and “Why it helps”. The quote must match the candidate’s recorded answer in that station. Missing or unverified coaching falls back to a topic structure without an invented quote.
- **Motivation and reflection:** question-specific structure only. Live QA found that generated first-person rewrites could invent a candidate’s experience despite prompt instructions. The structured response schema and server now disallow these rewrites for motivation stations.
- **Try it in your own words:** an optional practice pad lets the candidate rehearse a better response on the same page. It is explicitly not saved or scored.
- **Practise → Full mocks → Full MMI practice mock:** six stations using 60 seconds of reading plus five minutes of discussion each. The 41-minute provider cap allows for the 36 minutes of station time and setup/transition overhead. This is a general practice format, not a claimed university admissions format.
- **Admin Medicine lab:** edition 10 records this release. The existing question approval batch remains unpublished.

## Implementation

`StationTimePanel` and `useStationAnnouncements` sit alongside the existing deadline-based station clock. A clock snapshot now carries its station identity, preventing the previous station’s final-minute state from flashing or chiming when the next station starts. Follow-ups do not restart the clock. Fullscreen uses the same panel inside the interview root.

The feedback function adds optional coaching to its existing single structured assessment request. The server checks the station number and question, exact candidate quotation, masked assessment transcript, output lengths and three structure steps. No extra assessment model request is introduced. Coaching uses the existing `detailed_feedback` JSON column, so older records still load.

The shared engine announces the configured reading time and frames roleplay opening words as part of the brief during preparation. Existing school timings remain: Leeds-style two minutes of reading, Manchester-style no reading. Oxford and Cambridge retain academic exercise formats. Their published formats should be checked each admissions cycle; this change does not redefine them.

The new mock is included in launchers, rubric configuration, history, Medicine statistics and guest access. Migration `20261005000001_mmi_practice_mock.sql` adds its identifier to the two existing guest policy functions. It preserves ownership checks, one guest per invitation, two interview starts and required product feedback; it does not alter existing rows.

## Validation

- **316 application tests** passed, including clock transitions, delayed ticks, one-time announcements, muted alerts, coaching fallback and the shared interview engine.
- **159 backend tests** passed, including strict coaching schemas, quote provenance, wrong-station rejection, personal-reflection rewrite suppression, session ownership and complete-circuit restrictions.
- **98 isolated PostgreSQL guest checks** passed, including repeated migration application and the new interview type.
- Application typecheck, production build and Deno checks for the changed functions passed. The build retains its existing large-chunk advisory.
- Real Supabase/OpenAI calls exercised all four focused station types. Reviewed the coaching and verified saved quotes against the supplied candidate text. Retested motivation after replacing generated personal rewrites with structures.
- The live general mock advanced through six distinct stations and completed using accelerated `time_up` requests. A full-transcript assessment later saved six question reviews. Provider 503 responses occurred in initial QA: one on an answer and one on full-circuit scoring. Replaying the six-station transcript with reconstructed question/answer evidence in a fresh temporary QA session scored successfully in 7.6 seconds. This is evidence of functional recovery, not a claim that external-provider interruptions cannot happen.
- Real Anam browser checks used local frontend code with deployed services: video frames and inbound audio received; fixed timer after scrolling at **320px and 390px**; full five-minute allowance after early start; accelerated final-minute alert/chime once; working mute control; next full-mock station starts with a fresh reading clock; feedback saved; WebRTC closed; no browser runtime errors in those flows.
- Inspected mobile screenshots of the timer, warning and inline coaching. Coaching and the private practice pad also fit at 1440px.
- Live private-guest checks started the new mock, rejected a third interview, retained the mandatory product-feedback phase and denied founder/admin privileges. Temporary QA accounts, invitations and records were removed.

## Deployment and limits

Applied the guest migration and deployed `interview-brain`, `generate-interview-feedback` and `get-anam-session-token` to the existing Supabase project. The migration used the remote migration ledger and added only the reviewed new version.

The frontend reaches the public domains after GitHub sync and **Lovable → Publish → Update**. This workspace has no authenticated Lovable publishing control.

Browser timing checks were accelerated; this release did not run a 36-minute uninterrupted call or test a physical iPhone/Safari. Chimes depend on browser audio support and permission; the visible warning remains available. AI coaching is practice guidance, not an official university model answer or an educator-validated marking scheme. Older saved feedback receives the structure fallback and is not automatically regenerated.

### References

- [OpenAI structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs): required fields, strict objects and nullable output.
- [Manchester interviews](https://www.bmh.manchester.ac.uk/study/medicine/apply/interviews/): school-specific format rather than a universal one-minute reading rule.
- [Leeds MMI preparation](https://medicinehealth.leeds.ac.uk/medicine/doc/preparing-mmi): source associated with the existing Leeds configuration.
