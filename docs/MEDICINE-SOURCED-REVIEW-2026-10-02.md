# Medicine question review release — 2 October 2026

## Where to review

Sign in with an authorised administrator account and open **/admin/medicine-review**. Links also appear in the Medicine portal, main admin dashboard and older question-review page. After Lovable sync and **Publish → Update**, the public route is [MMI Practice question review](https://mmipractice.co.uk/admin/medicine-review).

The batch contains **24 public Medicine examples from eight sources**, paraphrased for editorial review. It includes 19 discussion prompts, two roleplays and three academic prompts. Oxford academic questions are explicitly separate from MMI. These are published preparation examples, not a claim about confidential past questions or upcoming interviews.

Each proposal includes a source link and locator, retrieval status, suggested follow-up, review focus and any additional release checks. The follow-ups and review focus are editorial suggestions, not an official mark scheme. Seven proposals identify closely related live questions so they can be considered as replacements rather than expanding the bank with near-duplicates.

## Approval workflow

- Search by question, topic, source or format; filter by topic and decision.
- Approve, request changes, reject, save notes or reopen a review. Changes and rejections require a reason.
- Decisions and revision history persist in Supabase. Unsaved drafts survive navigation between questions. Failed saves keep the draft and expose a retry; leaving with unsaved notes prompts a warning.
- A stale save returns HTTP 409. Reload brings in the latest decision while retaining the local note for comparison. It does not overwrite another review silently.
- Approval is tied to the exact wording, source verification and related-question guidance. Editing these invalidates the previous approval.
- Export includes only currently approved versions, with provenance and remaining release checks.
- **Approval does not publish content.** These proposal IDs are excluded from both live interview and feedback banks. They still need a separate reviewed content release, including candidate briefs, actor packs for roleplays and appropriate clinical or academic review.

## Public sources

| Source | Proposals | Retrieval on 2 October 2026 |
| --- | ---: | --- |
| [Royal College of Surgeons of England](https://www.rcseng.ac.uk/careers-in-surgery/careers-support/applying-to-medical-school/interview-questions/) | 5 | Full page checked; older admissions and healthcare-system claims excluded. |
| [NHS Health Careers](https://www.healthcareers.nhs.uk/printpdf/873) | 4 | Official indexed question text checked; direct retrieval unavailable. |
| [Medical Schools Council mock MMI guide](https://www.medschools.ac.uk/wp-content/uploads/2025/05/how-to-run-a-mock-mmi.pdf) | 4 | Full PDF checked; historical teaching resource, not current admissions rules. |
| [Medical Schools Council interviews leaflet](https://www.medschools.ac.uk/media/2773/interviews.pdf) | 3 | Official indexed questions checked; historical pandemic advice excluded. |
| [Queen’s University Belfast sample MMI stations](https://www.qub.ac.uk/schools/mdbs/Study/Medicine/HowtoApply/MMIs/) | 2 | Complete sample scenarios in official indexed text; direct page returned 403. |
| [University of Oxford Medicine examples](https://www.ox.ac.uk/admissions/undergraduate/applying/guide-for-applicants/interviews/sample_questions) | 2 | Full page checked; historical country mortality rankings are not asserted as current facts. |
| [Lancaster University sample stations](https://www.lancaster.ac.uk/lms/medicine/mbchb-medicine-and-surgery/entry-requirements/medicine-applicants/) | 1 | Official indexed example checked; original URL returned 404 and needs a current replacement before release. |
| [Great Ormond Street Hospital interview preparation](https://media.gosh.nhs.uk/documents/2._Medical_School_Interview_Preparation_and_Interview_Response_Analysis.pdf) | 3 | Full public PDF retrieved and text-extracted. Worked responses are not reproduced. |

## Other fixes

- Removed the main admin dashboard's hardcoded browser passcode and session-storage bypass. Access requires a signed-in account confirmed by the server's administrator check. The new review tables also enforce administrator access independently.
- Parent feedback now labels missing totals **Partial assessment**, hides unassessed skill chips and distinguishes a genuine assessed zero from missing evidence. Averages expose the number of scored sessions.
- Replaced an unsupported “readiness” percentage with actual practice days. Corrected a count of active days previously labelled as sessions.
- Interview-history failures show a recoverable error rather than “no interviews”. History queries are scoped to the current account and transcript dialogs reset on account changes.
- Partial assessments cannot enter the legacy feedback layout, which assumes every score is numeric.
- Research lab edition 09 records this release.

## Backend and validation

Migrations `20261002000001_question_review.sql` and `20261002000002_question_review_conflicts.sql` are deployed to the existing Supabase project. They add review and audit tables plus an administrator-only save operation. No interview-bank rows, balances or existing candidate transcripts were changed.

Browser testing caught a real integration defect in the first migration: SQLSTATE 40001 caused the API to retry a stale editorial decision indefinitely. The follow-up migration uses PT409 instead. This matches [Supabase's documented retry behaviour](https://supabase.com/docs/guides/troubleshooting/high-cpu-and-infinite-transaction-retries-when-using-custom-error-codes-in-rpc-functions-77326b). The completed live browser check observed HTTP 409 followed by a successful revision-3 save after reloading.

- 309 application tests pass across the full run and the subsequent targeted checks; 144 backend tests pass.
- 25 isolated PostgreSQL checks cover administrator access, direct-write denial, validation, audit history, stale revisions and repeatable migrations. Added to GitHub CI.
- TypeScript and production build pass. Existing Supabase session, question, order, attempt and transaction readiness checks pass.
- Real Supabase browser checks cover approval persistence, reload, approved export, simulated save outage and retry, concurrent edits, history and ordinary-user access denial.
- Desktop, 390px and 320px layouts checked without horizontal overflow; screenshots visually inspected. No browser runtime errors in the successful review run.
- Browser writes used an isolated QA batch. Temporary QA users, administrator entries, decisions and history were removed. Founder review decisions were not approved or modified by testing.

These checks verify the changed workflow and existing automated coverage. They do not establish that every website path is bug-free, validate clinical answer keys, or repeat the earlier full Anam audio/video checks. Interview engine code and live content are unchanged in this release.

## Release steps

1. Sync the main GitHub branch in Lovable and choose **Publish → Update** for the frontend.
2. Review the batch at **/admin/medicine-review**.
3. Prepare a separate content release for selected proposals only after the listed release checks are complete.
