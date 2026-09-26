# Medicine practice release — 26 September 2026

## Candidate experience

- Four focused stations: ethics, communication, motivation and data. Each has 30 seconds to read and five minutes to answer; one station per session. Full school circuits retain their own timings.
- Clear interview title, station progress, reading/answer clock and labelled controls. Completed interviews show feedback without disconnected call controls.
- Feedback starts with the score, one evidenced strength and one next step. Candidates can expand skill evidence, station review, annotated transcript and full notes.
- Original worked-answer library with a draft, comparison, self-review and follow-up challenge. These examples are practice material, not official university answers.
- Displayed transcripts, feedback and exports mask common English profanity. Original private engine evidence remains available for assessment.
- The Medicine dashboard opens the selected interview's feedback and uses the correct MMI or academic rubric. Academic scores are excluded from MMI skill averages.

## Communication question release

Live checks found 32 active Medicine questions but no roleplay stations. Release only these two existing authored scenarios through `scripts/publish-medicine-practice-content.mjs --apply`:

| ID | Scenario | Review |
| --- | --- | --- |
| MED-RP-013 | The group project | Fictional peer disagreement; candidate owns their action, asks about the obstacle and agrees a plan. Candidate context and opening are complete. The opening and live exercise response exclude actor instructions, unrevealed facts and marking guidance. No clinical knowledge or missing prop. |
| MED-RP-018 | Cancelled again | Fictional cancelled community activity; candidate acknowledges inconvenience and offers a realistic contact plan. No diagnosis, treatment or promises to fix equipment. Corrected a travel inconsistency: the family arrives by bus, so the child waits nearby with another volunteer rather than in a car. |

This is an editorial and functional review, not a clinician's endorsement or a validated admissions assessment. Roleplay endings guide actor behaviour; the final score remains based on observed candidate evidence across the four MMI dimensions.

The diagram station MED-RP-019 is excluded because its required diagram is not supplied. Other unpublished stations remain unpublished. The script inserts missing IDs only, ignores conflicts and verifies existing rows are unchanged; it never reactivates or overwrites a retired/edited question. Running without `--apply` is read-only.

## Medicine address

Prepared address: **medicine.intrvue.ai**. It uses the existing registered domain, so there is no additional domain registration. DNS currently delegates to GoDaddy (`ns55.domaincontrol.com`, `ns56.domaincontrol.com`); the subdomain is not connected yet.

1. In the existing Lovable project, publish/update the latest GitHub `main` build.
2. Add `medicine.intrvue.ai` under the project's custom domains. Use the exact verification and DNS records Lovable supplies; do not guess an IP or replace the root domain records.
3. Add those records to the existing GoDaddy zone. Wait for Lovable verification and HTTPS activation.
4. Add `https://medicine.intrvue.ai/**` to the existing Supabase Auth redirect allowlist. Keep current production redirects. Check any identity provider's allowed origins if that provider requires them.
5. Verify HTTPS, Medicine's signed-out landing page, sign-in/return, a live station, saved feedback, and switching to 11+. New visitors on this hostname default to Medicine; an explicit stored product choice is respected.

The code and Supabase functions do not connect DNS or publish the Lovable frontend automatically. Authenticated access to those settings is still needed. Lovable's custom-domain feature may require a paid hosting plan; the subdomain itself has no registration charge.

References: [Lovable custom domains](https://docs.lovable.dev/features/custom-domain), [publishing updates](https://docs.lovable.dev/features/publish), [Medical Schools Council interviews](https://www.medschools.ac.uk/for-students/applying-to-medical-school/interviews/), [GMC student professionalism](https://www.gmc-uk.org/education/standards-guidance-and-curricula/guidance/student-professionalism-and-ftp/achieving-good-medical-practice).

## Verification and deployment

- 233 application tests and 65 backend handler tests pass; TypeScript, Deno checks for both changed functions, and the production frontend build pass.
- Browser checks at 320, 390 and 1440 pixels cover the Questions page, both Medicine colour schemes, worked-answer drafts, and latest/older feedback links. Screenshots were inspected as well as checking page overflow; the latter alone missed a crowded interview title, which was corrected.
- Real Anam video/audio, opening, follow-ups, station timing transition, censored transcript, saved feedback and clean call shutdown passed for all four focused modes. 11+ also passed synthetic microphone speech through Anam, feedback persistence and exact credit charging. These checks used the local frontend against the deployed Supabase backend with disposable confirmed test accounts; test accounts and associated rows were removed.
- One motivation scoring request failed transiently. The server had saved its transcript and a retry produced feedback. A separate browser check deliberately returned a 503 on the first scoring request and verified a censored transcript download, the Retry feedback button, a successful real scoring response, exactly one saved feedback record and call shutdown. This establishes recovery behaviour, not immunity to upstream outages.
- Deployed `interview-brain` and `generate-interview-feedback` to project `fjkuuzfuysemrofcmnvd`. Added only MED-RP-013 and MED-RP-018 to `questions`; all 32 pre-existing Medicine rows were verified unchanged. Schema/readiness checks pass. No schema migration or payment/email change is included.
- The public frontend and new subdomain require the Lovable/GoDaddy steps above. The live backend deployment alone does not publish this frontend.
