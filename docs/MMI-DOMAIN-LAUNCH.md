# MMI Practice: launch queue

## The setup

Use the **existing Lovable project** connected to [IntrvueAI/my-web-launchpad](https://github.com/IntrvueAI/my-web-launchpad), branch `main`. The two domains serve the same release with different product pages. Anam connections, interview execution and recovery stay shared. Medicine and 11+ retain their own questions, instructions and scoring.

The existing Supabase project, `fjkuuzfuysemrofcmnvd`, keeps accounts, credits and saved interviews in place. Existing users sign in with the same details on the new domain. Their browser login is not automatically shared across domains.

## Queued steps for the founder

These require your Lovable, domain-provider and Supabase settings access. No new Lovable project or GitHub repository is needed.

1. **Publish the update in the existing Lovable project.** Check that GitHub has synced the latest `main`, then choose **Publish → Update**.
2. **Add `mmipractice.co.uk` and `www.mmipractice.co.uk`** under **Settings → Domains → Connect existing domain**. Use the exact DNS records Lovable supplies in your domain-provider panel. Current nameservers are one.com; preserve email records. **Unset the primary domain**, so both brands keep their own address. [Lovable domain settings](https://docs.lovable.dev/features/custom-domain#primary-domain).
3. **Add the new sign-in return addresses** to the existing Supabase project's **Authentication → URL Configuration → Redirect URLs**. Keep the existing addresses and Site URL. Add:
   - `https://mmipractice.co.uk/`
   - `https://mmipractice.co.uk/reset-password`
   - `https://www.mmipractice.co.uk/`
   - `https://www.mmipractice.co.uk/reset-password`

   These cover the app's email confirmation, Google sign-in and password-reset destinations. [Supabase redirect settings](https://supabase.com/docs/guides/auth/redirect-urls).

4. **Return here once both domains show Live in Lovable.** We can then check HTTPS, existing-account sign-in, Google/email returns, a real interview and payment return on the actual new domain. After those pass, switch `MEDICINE_DOMAIN_LIVE` in `src/lib/site.ts` to `true` and publish that small handover release.
5. **Create your tester link** while signed into your usual admin account: open `/admin/guest-trials`, create an invitation, and use **Copy link**. The signed-in account owns its invitations and results. No founder email needs to be copied into code.

Until step 4, Medicine remains available on intrvue.ai. The new domain already selects the Medicine interface when it serves this build. The handover flag only controls the existing domain's transition and the default domain for newly copied invitations.

## Where to find the changes

| Page                   | Address after publication           | What it does                                                      |
| ---------------------- | ----------------------------------- | ----------------------------------------------------------------- |
| Medicine home          | New domain `/`                      | MMI branding, Medicine dashboard, existing account access         |
| Guest management       | `/admin/guest-trials`               | Create, copy and close private links; review named tester results |
| Private welcome        | `/try#…` from the invitation page   | Name, consent and entry without ordinary signup                   |
| Guest interview room   | `/guest-session` after joining      | All nine Medicine modes using the shared Anam engine              |
| Worked answers         | `/medicine/examples`                | Existing 24 medicine-specific MMI scenarios and follow-ups        |
| Practice studio        | `/medicine/practice` or `/practice` | Existing rehearsal, reflection and planning tools                 |
| Browser notes transfer | `/medicine/move` on both domains    | Export and restore local studio notes and worked-answer drafts    |
| Build journal          | `/admin/medicine-lab`               | Release notes and existing research/testing tools                 |

## Guest trials

Default invitation: 10 guests, 12 interviews each, seven-day link lifetime, six hours per guest. The founder can change the guest count and link lifetime. Links can be closed early. Guest requests check expiry, revocation, owned sessions and quotas on the server. Each guest has a separate restricted identity; the founder's credentials and credits are not shared.

Guests explicitly acknowledge that their host can see their name, transcript, scores and feedback. Tokens stay in that tab's session storage. Ordinary account storage stays separate. The founder's trial page reads only the guests belonging to that founder's invitations. Revocation blocks further requests immediately and open guest pages check every 30 seconds; an already issued external avatar connection is bounded by its session limit.

Pilot previews remain labelled as original practice drafts, with no claim of official university questions or validation. Invited guests may access the three pilots; ordinary uninvited accounts retain the existing pilot access rules.

## Browser-only notes

Saved interviews and account balances need no copying. Local practice notes are specific to a browser and domain. Export them from `/medicine/move` on intrvue.ai, sign into the same account on MMI Practice and restore there. Export signed-out notes separately if you also practised while signed out. The importer merges studio history and preserves existing worked-answer drafts. It accepts only recognised Medicine data and excludes credentials.

## Editing later in Lovable

For visual changes, specify whether they apply to **MMI Practice**, **11+**, or **both**. Keep shared interview changes in `InterviewPlatform`, `useInterviewSession` and the common Supabase functions. Keep product-specific content in its existing subject packs. Test both product flows after changing shared code.

## Release verification

The backend migration and all 14 functions were deployed on 1 October 2026. Validation passed: 260 application tests, 86 backend tests, 94 PostgreSQL checks, TypeScript, all edge-function type checks and the production build. Local tests cover invitation signatures, ownership, expiry, revocation, retry behaviour, quotas, forged feedback, session-state tampering, ordinary-user compatibility, note transfer and payment failure/retry states.

Live checks started all nine Medicine modes, including Oxford, Cambridge and Imperial; generated saved Medicine feedback; tested owner-only transcript review; and rejected guest email/feedback forgery. A browser trial received real Anam video and audio, submitted a typed answer, ended the call and rendered saved feedback. It preserved an existing founder login, fitted a 390px mobile viewport, and had no runtime errors in the tested flow. The ordinary 11+ flow also charged a temporary account’s own three-credit balance, started its brain and Anam token, processed an answer and saved school-rubric feedback. Test identities and invitations were removed.

These are functional checks using temporary test accounts. They do not establish full-duration reliability on every device, clinical validation, completed real purchases, or publication at the new domain. DNS, provider settings and Lovable publication remain the queue above. Metadata changes with hostname in the browser; crawlers that do not execute JavaScript can still see the shared initial HTML metadata, so inspect social/search previews after the domain is live.
