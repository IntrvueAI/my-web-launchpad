# Supabase backend release — 17 September 2026

## Status

The application uses **Anam as its only avatar provider**. The alternate avatar screen, admin interview option, SDK dependency and three backend implementations have been removed. The release now includes **13 active edge functions**.

**Deployed to `fjkuuzfuysemrofcmnvd` on 17 September 2026.** All 13 managed functions report ACTIVE. The three retired Tavus endpoints were deleted and return 404. The pre-existing `submit-feedback` endpoint remains unchanged at version 21, giving 14 live functions in total. Historical migration files and past interview records are retained; they do not enable an integration. No payments or emails were sent.

## Changes retained from the backend audit

| Area | Result |
| --- | --- |
| Payments | Signed Stripe callbacks and browser verification share atomic settlement. Owner, amount, currency and credit metadata must match. Replay cannot award credits twice, and failed writes roll back. Existing prices remain unchanged. |
| Credits | Removes old policies allowing direct balance/order writes. Administrator adjustments serialize with purchases and credit consumption. |
| Interview engine | Bounded inputs, session ownership and administrator gates. Repeated turns can replay before loading the question bank. Existing subjects remain mapped. |
| Anam | Retains custom-engine and legacy persona paths, validates references/durations/tokens and bounds token-request time. The Deepgram listening trial uses Anam avatars and supplies its session reference and heartbeat. |
| Feedback | Saves the owned transcript before scoring. Rejects invalid model output rather than inventing a grade. Uses Medicine-appropriate evaluator wording and supports existing 11+ feedback. Optional enrichment shares a deadline. |
| Question history | Replaces attempts in one transaction, preserving the previous history if a retry fails. |
| Speech and email | Bounds audio buffering, cleans up stalled/late connections and uses temporary comparison-provider tokens. Validates and escapes email/report inputs; reports provider failures. |
| Deployment | Checks project access, provider secret names, pending migrations and local tests before applying. Deploys the 13 active functions, deletes only the three named retired endpoints, and verifies the resulting inventory. |

## Deployment sequence

1. Complete `npx --yes supabase@2.117.0 login --agent no --output-format text` with access to project `fjkuuzfuysemrofcmnvd`. The interactive flow requests browser verification; no access token belongs in the repository.
2. Run `npm run supabase:plan`. The repository and live project have historical timestamp differences. The command fetches the actual remote migration ledger into an ignored temporary work directory, then appends only the three explicitly reviewed release migrations. It never repairs the remote ledger or replays older local SQL. The first deployment added three versions to the 29 recorded versions; a subsequent plan should have no pending updates.
3. Required secret names: `OPENAI_API_KEY`, `ANAM_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`, `DEEPGRAM_API_KEY`. `EMAIL_FROM` should name a Resend-verified sender. AssemblyAI and Speechmatics keys are optional for the administrator speech comparison. No Tavus key or callback setup is required.
4. Run `npm run supabase:deploy`. Migrations run before functions, in this order:
   - `20260916000001_medicine_engine_reliability.sql`
   - `20260917000001_backend_payment_integrity.sql`
   - `20260917000002_backend_attempt_integrity.sql`
5. The script removes `tavus-create-conversation`, `tavus-end-conversation` and `tavus-webhook` if present, then verifies they are absent and all active functions are deployed. It does not broadly prune other functions or erase historical records.
6. Run `npm run backend:readiness`. This reads schema metadata and RPC availability without executing database writes.
7. Perform authenticated acceptance: existing 11+, maths, chat and Medicine interviews; administrator school pilots and ordinary-user denial; full Anam conversations, interruption/end/transcript/feedback; concurrent starts; Stripe test-mode settlement and redelivery. Subscribe to `checkout.session.async_payment_succeeded` if delayed payment methods are used.

Missing credentials, provider secret names, unexpected pending migrations or failed checks stop deployment. Secret-name presence does not validate the key value or external provider settings. Local mocks do not establish live avatar quality, payment delivery or email delivery.

## Verified results

- 211 application tests, 59 backend handler tests and 37 isolated PostgreSQL checks passed.
- All 13 managed function entrypoints passed Deno checking; application TypeScript and the production build passed. The existing large main-bundle warning remains.
- Live schema checks find all required columns and all three new database operations.
- Oxford, Cambridge and Imperial: real Anam token creation, engine opening and follow-up, persisted school-specific circuits, replay without duplicate state updates, ended-session rejection and ordinary-user denial all passed.
- Existing maths, 11+, chat and Medicine engine openings passed against the live service.
- Temporary test accounts, administrator entries and sessions were removed.
- Full microphone/video conversations, real Stripe events and email delivery have not been verified. Anam token issuance alone does not establish audiovisual quality.
- Pre-deployment function sources and version inventory were saved locally for recovery.

## Repeatable checks

```text
npm run test:run
npm run test:backend
npm run typecheck
deno check --node-modules-dir=none --no-lock supabase/functions/*/index.ts
npm run backend:sql-check
```

The SQL rehearsal uses isolated in-memory PostgreSQL through `@electric-sql/pglite@0.5.8`; set `PGLITE_MODULE` to an existing installation if needed. The local admin lab's **Backend tests** button runs the actual handler suite and displays its output. Tests use mocked providers and send no real emails or payments.

## References

- [Supabase function deployment](https://supabase.com/docs/guides/functions/deploy)
- [Supabase explicit function deletion](https://supabase.com/docs/reference/cli/supabase-functions-delete)
- [Stripe SDK 16.12.0 API contract](https://github.com/stripe/stripe-node/blob/v16.12.0/src/apiVersion.ts)
- [AssemblyAI temporary streaming tokens](https://www.assemblyai.com/docs/coding-agent-prompts)
- [Speechmatics WebSocket protocol](https://legacy.docs.speechmatics.com/en/real-time-appliance/api-v2/speech-api-guide/v3.4.0)
