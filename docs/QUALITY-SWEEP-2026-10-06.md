# Quality sweep — 6 October 2026

## Changes

- Medicine Home labels incomplete feedback as a partial assessment and counts only scored sessions in its average caption. Practice totals still include partial sessions.
- Home, Progress and Feedback show a retry action after a failed feedback request, instead of an endless loading placeholder or a misleading empty history.
- Feedback falls back to an available assessment if the requested record is missing.
- The recommended practice card can shrink on narrow phones.
- Explicit or saved Medicine start links cannot override a host dedicated to 11+.

## Verification

- 356 application tests, including eight new regression cases; 159 backend tests.
- TypeScript check and production build pass.
- 111 classroom database checks pass.
- Live Supabase schema/readiness checks pass for sessions, questions, payments, attempts and the payment/credit/attempt operations.
- Authenticated browser checks cover 11+ selection, Medicine mini/full selection and setup, the Medicine landing page, private guest redemption/catalogue, and the dedicated 11+ deep-link guard.
- Browser layouts checked at 320, 390 and 1440 pixels. Teacher profile editing, roster sorting and persisted sign-out also checked on mobile.
- Temporary test accounts and invites removed.

These checks do not repeat complete live avatar interviews, real purchases or every admin action. There are no database or edge-function changes in this release. The public Lovable site needs Publish → Update after GitHub sync.
