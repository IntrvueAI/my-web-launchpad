# MMI Practice: launch queue

## The setup

Use the **existing Lovable project** connected to [IntrvueAI/my-web-launchpad](https://github.com/IntrvueAI/my-web-launchpad), branch `main`. The two domains serve the same release with different product pages. Anam connections, interview execution and recovery stay shared. Medicine and 11+ retain their own questions, instructions and scoring.

The existing Supabase project, `fjkuuzfuysemrofcmnvd`, keeps accounts, credits and saved interviews in place. Existing users sign in with the same details on the new domain. Their browser login is not automatically shared across domains.

## Current release and remaining publication step

The Medicine domains respond over HTTPS. On 1 October 2026, the saved Supabase CLI login was used to add and verify all four MMI sign-in/reset return addresses while preserving every existing auth setting. Email/password sign-in was verified on `www.mmipractice.co.uk` with a temporary account. Existing production accounts and credits remain in the original Supabase project.

The two-attempt beta links and required tester survey are published on the Medicine domains. The new interview feedback hub has its Supabase migration and endpoint deployed. After GitHub syncs the feedback-hub release, use **Publish → Update** in the existing Lovable project to publish `/admin/guest-feedback` and the updated navigation. There is no authenticated Lovable publishing control in the current development environment.

Keep both domains attached to the same Lovable project, with primary domain unset so the two brands retain their addresses. `MEDICINE_DOMAIN_LIVE` remains false pending the final old-domain handover check; Medicine already appears on the new domain, and new beta links use `mmipractice.co.uk` in production. The flag only controls redirects and the original domain becoming 11+ only. Real Google-provider completion and payment checkout on the new domain remain separate launch checks.

## Invite a beta tester

1. Sign into your usual founder/admin account and open `/admin/guest-trials` (also linked as **Beta testing portal** from the account menu and main admin page).
2. Add a label, set the link lifetime from 1–14 days, and choose **Create private invitation**.
3. Use **Copy link** or **Draft email**. Draft email opens your email app with the link and instructions; it does not send anything automatically.
4. The tester follows `/medicine/<private-code>`, enters a name and acknowledges that the host can review their trial. No email, password, Gmail login or signup form is required.
5. They receive **two interview attempts**, across the nine Medicine modes, with six hours from joining (or until invitation expiry, if sooner). An attempt counts when the server authorises its first interview request. Reconnecting the same attempt does not consume another; ending early does not reset the allowance.
6. After the second interview, the required `/guest-feedback` page asks for a usefulness rating, whether the interview worked, and a short improvement suggestion. **Finish trial & give feedback** ends an unused remainder early. Saved product feedback and interview assessments appear under the host's invitation.

A new link admits one guest identity. The same tab can retry admission after a connection problem without using another place. A second tester cannot claim it. Keep the tab open for both attempts; reloads preserve usage. Short links contain 128 bits of randomness, are removed from the address bar on entry, and are excluded from app URL logs and referrers. Treat the link as a private invitation.

The portal labels links ready, claimed, completed, expired or closed, and disables sharing controls after all guest places are claimed. A tester can still submit product feedback if the invitation expires or is closed. They cannot restart practice after finishing the trial or use a third interview. Forms retain drafts on reload and after a network failure. Previously issued signed invitations keep their original limits and are labelled as earlier invitations; all newly generated links use the fixed one-guest/two-attempt policy.

## Where to find the changes

| Page                   | Address after publication           | What it does                                                      |
| ---------------------- | ----------------------------------- | ----------------------------------------------------------------- |
| Medicine home          | New domain `/`                      | MMI branding, Medicine dashboard, existing account access         |
| Guest management       | `/admin/guest-trials`               | Create, copy and close private links; open a tester’s feedback |
| Founder feedback hub   | `/admin/guest-feedback`             | Search testers, filter issues and interview types, read each assessment and trial review |
| Private welcome        | `/medicine/<private-code>`   | Name, consent and entry without ordinary signup                   |
| Product feedback       | `/guest-feedback`                  | Required tester survey, then access to saved interview assessments |
| Guest interview room   | `/guest-session` after joining      | All nine Medicine modes using the shared Anam engine              |
| Worked answers         | `/medicine/examples`                | Existing 24 medicine-specific MMI scenarios and follow-ups        |
| Practice studio        | `/medicine/practice` or `/practice` | Existing rehearsal, reflection and planning tools                 |
| Browser notes transfer | `/medicine/move` on both domains    | Export and restore local studio notes and worked-answer drafts    |
| Build journal          | `/admin/medicine-lab`               | Release notes and existing research/testing tools                 |

## Guest trials

New invitations: one guest, two interview attempts, seven-day link lifetime by default, six hours per guest. The founder can change the link lifetime. Links can be closed early. Guest requests check expiry, revocation, owned sessions and quotas on the server. Each guest has a separate restricted identity; the founder's credentials and credits are not shared.

Guests explicitly acknowledge that their host can see their name, transcript, scores and feedback. Tokens stay in that tab's session storage. Ordinary account storage stays separate. The founder's trial page reads only the guests belonging to that founder's invitations. Revocation blocks further interview requests immediately and open guest pages check every 30 seconds; an already issued external avatar connection is bounded by its session limit.

Pilot previews remain labelled as original practice drafts, with no claim of official university questions or validation. Invited guests may access the three pilots; ordinary uninvited accounts retain the existing pilot access rules.

## Review tester feedback

Open **Beta testing portal → Interview feedback**, or **Tester interview feedback** in the Medicine account menu. This page shows only invitations owned by the signed-in founder. Existing accounts’ personal feedback remains in their usual dashboard.

- Select a tester, then choose an interview. AI assessments show the practice score, strengths, next step and the rubric for that interview, including academic Oxford/Cambridge criteria. Skill evidence, the censored transcript, transcript download and full improvement notes are expandable.
- **Tester’s product feedback** is their own usefulness rating and comment about the whole trial. It is collected once per trial, not once per interview. Counts and average ratings do not duplicate a review across its two interviews.
- Search names/invitation labels, filter by interview type, or choose **Reported an issue**, **Review received** or **Awaiting review**. Results are paged in groups of 20 testers; summary totals cover all owned invitations, or the selected invitation.
- Started attempts without saved AI feedback appear as **No saved assessment**, without an invented zero. Regenerated assessments show the newest saved result for that session. Older saved results remain visible even when their session record has been removed.
- Results refresh every 30 seconds while the page is open. A failed refresh keeps the previous result and provides a retry. On phones, choose a tester to open their detail view and use **All testers** to return.

The read-only `get_mmi_feedback_inbox` database function is executable only by the service role. `mmi-guest-access` verifies founder status and supplies the owner ID from the authenticated user; callers cannot choose another owner. Full transcripts are fetched on demand through the existing invitation ownership check. No guest quota, Anam, credit or interview-brain behavior was changed for this release.

## Browser-only notes

Saved interviews and account balances need no copying. Local practice notes are specific to a browser and domain. Export them from `/medicine/move` on intrvue.ai, sign into the same account on MMI Practice and restore there. Export signed-out notes separately if you also practised while signed out. The importer merges studio history and preserves existing worked-answer drafts. It accepts only recognised Medicine data and excludes credentials.

## Editing later in Lovable

For visual changes, specify whether they apply to **MMI Practice**, **11+**, or **both**. Keep shared interview changes in `InterviewPlatform`, `useInterviewSession` and the common Supabase functions. Keep product-specific content in its existing subject packs. Test both product flows after changing shared code.

## Release verification

The two guest migrations and all 14 functions were deployed on 1 October 2026. The beta-link release passed 261 application tests, 98 backend tests, 132 PostgreSQL checks, TypeScript, affected edge-function type checks and the production build. Local tests cover invitation signatures, ownership, expiry, revocation, retry behaviour, quotas, forged feedback, session-state tampering, ordinary-user compatibility, note transfer and payment failure/retry states.

Live checks started all nine Medicine modes, including Oxford, Cambridge and Imperial; generated saved Medicine feedback; tested owner-only transcript review; and rejected guest email/feedback forgery. A browser trial received real Anam video and audio, submitted a typed answer, ended the call and rendered saved feedback. It preserved an existing founder login, fitted a 390px mobile viewport, and had no runtime errors in the tested flow. The ordinary 11+ flow also charged a temporary account’s own three-credit balance, started its brain and Anam token, processed an answer and saved school-rubric feedback. Test identities and invitations were removed.

The beta-link release also passed 22 live/backend/browser checks, including concurrent single-use redemption, two real Anam connections, saved assessments, reload-safe quotas, third-attempt denial, automatic survey navigation, failed-submit recovery, assessment retry before survey navigation, claimed-link sharing controls, completed-trial lockout, and founder-only product feedback. These used the local frontend against the deployed backend. Test accounts and invitations were removed.

The feedback hub passed 263 application tests, 110 backend tests, 33 additional isolated PostgreSQL checks, TypeScript, the affected edge-function type check and a production build. Sixteen live/backend/browser checks used temporary founder and guest accounts with controlled assessment fixtures: ownership boundaries, direct-RPC denial, academic rubrics, separate product comments, censored transcript/download, interview switching, filters, missing assessments, mobile layout, accessibility, both palettes, invitation navigation, refresh failure/retry and zero browser runtime errors. All temporary accounts and their data were removed. This release did not start new Anam calls because interview execution was unchanged.

These are functional checks using temporary test accounts. They do not establish full-duration reliability on every device, clinical validation, completed real purchases, or completed Google OAuth/provider flows. The new feedback-hub frontend still needs Lovable publication as described above. Metadata changes with hostname in the browser; crawlers that do not execute JavaScript can still see the shared initial HTML metadata, so inspect social/search previews after the domain is live.
