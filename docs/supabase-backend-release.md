# Supabase backend release — 17 September 2026

## Status

All 16 edge functions are included in the local audit, explicit function configuration and deployment command. **This release has not been deployed.** The Supabase CLI has no account access token on this computer. Read-only requests to the configured project, `fjkuuzfuysemrofcmnvd`, confirmed that `engine_revision`, the new question metadata and attempt deduplication columns are missing. No remote rows, migrations, provider secrets, emails or payments were changed during this audit.

## Changes

| Area               | Result                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Payments           | Browser verification and signed Stripe callbacks use a single PostgreSQL transaction. Matching order, amount, currency, owner and credit metadata are checked. Replays add no credits; failed writes roll back. Delayed successful payments can recover failed orders. Checkout URLs are withheld when order persistence fails. Existing packs/prices remain 2/£19.99, 3/£29.99 and 5/£44.99.                                                                                                   |
| Credit permissions | Removes historical policies that let ordinary users write their own credit balance or create arbitrary orders. Existing read access and the credit-consumption RPC remain. Admin adjustments serialize with purchases and consumption.                                                                                                                                                                                                                                                          |
| Interview brain    | Bounded JSON input, validated identifiers/topics, ownership and administrator gates. A repeated turn can replay without reloading the question bank. Existing maths, logic, current affairs, 11+, Medicine and chat subjects remain mapped.                                                                                                                                                                                                                                                     |
| Anam               | Custom-engine and legacy persona paths are retained. Validates the session reference, duration and returned provider token; excludes the caller's current session from stale-session cleanup and bounds token-request time. The 11+ Deepgram client now supplies its session reference and a heartbeat.                                                                                                                                                                                         |
| Feedback           | Resolves the owned session and matching interview type before writing or scoring. Draft pilot scoring requires an administrator. Medicine is no longer described as an 11+ child interview in the evaluator prompt. 11+ V2 uses the 11+ pack. Invalid model output returns a retryable failure instead of a fabricated 12/20; transcript persistence still runs first. Optional annotation/improvement calls share a request deadline. Subject-specific JSON scores and legacy columns coexist. |
| Attempt history    | Replacing question attempts is one database transaction; a failed rebuild preserves the prior rows. Tavus tool redelivery uses a deterministic event key to prevent duplicates.                                                                                                                                                                                                                                                                                                                 |
| Tavus              | Preserves recently active interviews, checks database errors, attempts provider cleanup when setup persistence fails, and reports shutdown failure instead of silently claiming success. UI supports retrying shutdown and sends live heartbeats. Callback requests require a shared secret; sensitive headers are excluded from debug archives.                                                                                                                                                |
| Speech relays      | Bounded audio buffers, connection/session cleanup, and late-response guards. AssemblyAI uses a short-lived token rather than the permanent API key in the WebSocket URL. Speechmatics waits for RecognitionStarted and counts buffered audio frames in EndOfStream.                                                                                                                                                                                                                             |
| Email and reports  | Fixes undefined Supabase configuration in auth mail, handles provider rejection, adds a real magic-link template and escapes interpolated report fields. Removes token-preview logging. No email was sent during testing.                                                                                                                                                                                                                                                                       |
| Deployment         | Explicit configuration for all 16 functions. Read-only deployment planning refuses unknown historical migrations; application runs migrations before functions, preserves JWT exceptions, never prunes remote functions and checks the resulting active inventory. GitHub Actions runs regression checks without deployment credentials.                                                                                                                                                        |

## Validation

- 211 existing application tests passed across 25 files.
- 69 new backend tests execute the real handlers with mocked Supabase/provider boundaries. They cover all 16 functions, request limits, authentication, ownership, admin gates, old and new feedback modes, payment responses, callback authentication, duplicate callbacks and WebSocket cleanup/readiness.
- 38 isolated PostgreSQL checks passed using PGlite 0.5.8: settlement replay, owner/amount/currency mismatch, rollback on injected write failure, delayed payment recovery, credit adjustment, permissions, atomic attempt replacement, duplicate event keys and preservation of edited/retired Medicine questions.
- All 16 function entry points passed Deno 2.9.6 type checking. All 60 new school questions remain drafts outside the published bank.
- Application TypeScript and the Vite production build passed. The existing 618 kB main bundle warning remains. A real browser run clicked the admin lab's Backend tests button, completed the 69-test suite and verified the deployment-status journal without browser exceptions.
- Live Anam/Tavus calls, real Stripe events, authenticated remote session concurrency and actual email delivery have **not** been exercised. Local mocks do not establish live provider quality or prove every production path.

## Required deployment sequence

1. Sign in using `npx supabase@2.117.0 login` with access to `fjkuuzfuysemrofcmnvd`. Do not commit or paste the access token into source files.
2. Run `npm run supabase:plan`. It lists pending migrations and required secret names. Reconcile any unexpected historical migrations; never use a database reset or blindly replay old migration files. Some old migrations include historical data updates.
3. Configure required provider secrets in Supabase. Existing names: `OPENAI_API_KEY`, `ANAM_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`, `TAVUS_API_KEY`, `DEEPGRAM_API_KEY`. New: `TAVUS_WEBHOOK_SECRET`, a random value of at least 32 characters. `EMAIL_FROM` should identify a sender verified with Resend. AssemblyAI/Speechmatics keys are optional for the administrator comparison tool.
4. Before deploying the Tavus functions, update the Tavus persona's `track_question_attempt` delivery URL to include the same `secret` parameter, or send `x-tavus-webhook-secret`. Keep its existing `conversation_id` substitution. Newly created conversation callbacks include the secret automatically. Drain existing Tavus sessions whose callbacks lack the secret. **Deploying without this configuration would interrupt the existing maths-v2 callback flow.**
5. Set `TAVUS_CALLBACK_CONFIGURED=1` in the deployment environment after configuring it. Apply the release with `npm run supabase:deploy`. The script runs backend tests/type checks, applies only reviewed pending migrations, then deploys all 16 functions via the Supabase API. It does not use `--no-verify-jwt`, `--prune`, `--include-all` or any reset command.
6. Required migration order:
   - `20260916000001_medicine_engine_reliability.sql`
   - `20260917000001_backend_payment_integrity.sql`
   - `20260917000002_backend_attempt_integrity.sql`
7. Run `npm run backend:readiness` for schema-only checks, then perform authenticated acceptance: existing 11+, maths, chat and Medicine flows; each school pilot as admin and denial as an ordinary user; full Anam conversation, timer/control transitions, interruption, ending, transcript/feedback; concurrent session starts; Tavus callbacks/end/retry; Stripe test-mode settlement and redelivery. Add `checkout.session.async_payment_succeeded` to the Stripe webhook subscription if delayed payment methods are used.

The deployment command stops on missing account access, missing required secret names, unknown migration history or failing local checks. Presence of a secret name cannot verify its value or an external provider's settings. Keep deployment output for diagnosing partial function uploads. Additive schema changes can stay in place if the previous function versions need restoring; do not delete live data to roll back.

## Repeatable checks

```text
npm run test:run
npm run test:backend
npm run typecheck
deno check --node-modules-dir=none --no-lock supabase/functions/*/index.ts
node scripts/check-medicine-expansion.mjs
```

For the SQL rehearsal, install `@electric-sql/pglite@0.5.8` locally without changing the lockfile, then run `npm run backend:sql-check`. Alternatively set `PGLITE_MODULE` to the absolute file URL of an existing installation. This check creates only an isolated in-memory database. The local admin lab's **Backend tests** button runs the handler suite and shows actual output.

## Primary references used

- [Supabase function deployment](https://supabase.com/docs/guides/functions/deploy) — CLI authentication, function deployment and configuration.
- [Stripe SDK 16.12.0 API contract](https://github.com/stripe/stripe-node/blob/v16.12.0/src/apiVersion.ts) — aligns the SDK with the existing 2024-06-20 API version.
- [AssemblyAI temporary streaming tokens](https://www.assemblyai.com/docs/coding-agent-prompts) — server-side temporary-token exchange for WebSocket clients.
- [Speechmatics WebSocket protocol](https://legacy.docs.speechmatics.com/en/real-time-appliance/api-v2/speech-api-guide/v3.4.0) — readiness handshake and audio sequence count.
- [Tavus callback configuration](https://docs.tavus.io/sections/webhooks-and-callbacks) — callback URLs and event payloads. The shared-secret check is implemented by this application; it is not described as a native Tavus signature scheme.
