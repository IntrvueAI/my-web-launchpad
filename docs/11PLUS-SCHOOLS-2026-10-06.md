# 11+ schools: teacher and pupil classrooms

## Where to find it

- Teacher workspace: `/schools` on Intrvue’s 11+ website.
- Pupil memberships and teacher comments: `/classes`.
- Private invitations: `/join-class/<random-code>`.
- Links are on the 11+ home dashboard, its account menu, and the public landing page’s “For schools” navigation. Medicine directs these routes to the 11+ website.

## Run a class

1. Sign in at `/schools`. Set your teacher name and school or tutoring organisation, and confirm that you are responsible for the pupils you invite.
2. Create a class with a name, year group and weekly interview target.
3. Copy its private invitation link and share it with pupils through your school’s usual channel. Links expire after 14 days; replace or close them in the class page.
4. Each pupil signs into their own existing student/parent account, enters the name you know them by, checks the teacher details and agrees to share new 11+ practice.
5. Approve recognised names under **Join requests**. Nothing is shared while a request is pending.
6. The roster shows completed practice, progress towards the weekly target and assessments awaiting review. Search by name or sort by practice activity or outstanding reviews.
7. Open **View practice**, select an interview, read its **AI assessment**, and add a separate **Teacher feedback** comment or mark it reviewed. Pupils read the comments in **My classes**.
8. Export the authorised roster’s progress as CSV, edit class settings, or archive a finished cohort. Teacher profile details are editable from the workspace.

## Sharing and calculations

- Only the owning teacher can read a class roster or its pupil feedback. There is no school-wide directory or global teacher privilege.
- A pupil shares school interview sessions created and started after their approval time. Earlier interviews and all Medicine interviews stay outside this classroom view.
- Pupils cannot see classmates or their results. Leaving, cancellation or removal stops teacher access at the database boundary; an open page refreshes every 30 seconds and on refocus.
- Rejoining starts a new sharing window and requires fresh consent and teacher approval. A declined/removed pupil needs the teacher to choose **Allow new request** first.
- An archived class is read-only and closes invitations. Interviews ending after archive are excluded. Pupils can still leave, and teachers can still remove members.
- Completed interviews count once, even if feedback was regenerated. The latest matching feedback is used. Both current and legacy text session references are supported within the same pupil and interview type.
- Weekly activity uses Monday–Sunday in Europe/London. Time is approximate elapsed interview time, capped at 90 minutes per session, not microphone speaking time.
- A full 11+ average includes only 11-plus/11-plus-v2 assessments with all four skill scores and a valid total out of 20. Partial assessments remain readable without becoming zero scores; subject practice is counted as activity but does not change the full 11+ average.
- Teacher comments are separate from AI assessment, pupil-visible, limited to 2,000 characters and protected against overwrites from another tab. The pupil page shows its ten most recent non-empty teacher comments per class.
- CSV cells escape spreadsheet formulas. Transcripts and displayed comments use the existing profanity filter.

## First-release account model

Each account represents one pupil. Pupils use existing sign-in methods and credits; class membership does not transfer credits, create free interview allowances, or share the teacher’s login. The teacher profile is self-declared, and pupil consent plus explicit approval controls access. Each class has one owning teacher. Limits are 25 active classes per teacher, 200 active/pending pupils per class and ten active/pending memberships per pupil. Managed pupil accounts without email, co-teaching, school-wide billing and SSO are future work.

## Implementation and deployment

The feature uses four private tables and the authenticated `school_portal` RPC. Direct client access to the new tables and helper functions is revoked. Existing interview and feedback row-level policies, Anam interview engines, payments and Medicine guest trials are unchanged.

Migrations deployed to project `fjkuuzfuysemrofcmnvd`:

- `20261006000001_school_classes.sql`
- `20261006000002_school_feedback_references.sql`

The second migration accommodates the existing feedback writer’s text references, preserving the first deployed migration’s history. Both are in the deployment allowlist. No new edge function or secret is required.

The frontend is delivered through `IntrvueAI/my-web-launchpad` on `main`. After GitHub sync, use **Publish → Update** in the existing 11+ Lovable project. Supabase deployment alone does not publish the frontend.

## Verification

- Application tests: 341 passed; backend tests: 159 passed.
- Type checking and production build passed. New classroom files passed targeted linting.
- 111 isolated PostgreSQL checks cover permissions, consent/approval, cross-teacher access, classmate isolation, legacy feedback references, partial scores, duplicate feedback, review conflicts, invitation lifecycle, leaving/rejoining, pagination, archive boundaries and class/roster capacity.
- A browser run against real Supabase completed teacher setup → class → private invite → pupil password sign-in → join request → teacher approval → real Anam 11+ interview → saved AI feedback → teacher comment → pupil comment view → CSV → leave/revocation → archive. Video and received audio worked; two answers and feedback requests returned HTTP 200; exactly three test credits were charged. No browser exceptions occurred.
- Additional browser checks covered teacher profile editing, sorting controls and persisted sign-out. New authenticated screens were checked at 320, 390 and 1,440 pixels; public entry pages at 320, 390, 1,024, 1,280 and 1,440 pixels. No horizontal overflow was found.
- All temporary QA users and their associated test records were removed.

Re-run the database suite with `node scripts/check-school-classes-migration.mjs` using `@electric-sql/pglite` (or `PGLITE_MODULE` pointing to its module). GitHub’s application/backend workflow runs this suite on every relevant change.

The live interview test was a short functional test, not a complete timed 11+ examination. Password return-to-invitation was exercised end to end. Google and email-confirmation returns use the same validated, 24-hour local destination; completing provider login or opening confirmation mail on another device was not tested.
