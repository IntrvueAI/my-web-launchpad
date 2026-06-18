# Interview Engine — implementation guide & runbook

> Built per `docs/INTERVIEW-ENGINE-ROADMAP.md`. Pilot subject: **Maths (Clara)**.
> This doc is the "how it actually works now + how to ship/extend it" companion.

## What changed (MVP → orchestrated brain)

Previously Anam's bundled GPT‑4o‑mini ran the whole maths interview from a static prompt with all
questions+answers baked in. Now **`maths-interview` is engine-driven**: our own "interview brain"
picks one question at a time from a server-held, tiered, randomised bank and **puppeteers** the Anam
avatar via `client.talk()`. Anam is just STT + face + TTS. All other interview types are unchanged
(still the legacy static-prompt path) until they're migrated.

```
student speech ─▶ Anam STT ─(MESSAGE_STREAM_EVENT_RECEIVED, endOfSpeech)─▶ useInterviewSession
   ─▶ POST interview-brain {sessionId, action, studentText}
   ─▶ engine.advance() : select question · judge · adapt · log evidence  (answers stay server-side)
   ─▶ { say } ─▶ client.talk(say) ─▶ avatar speaks
end ─▶ generate-interview-feedback reads interview_sessions.evidence ─▶ scores + questions_review
```

## Code map

| Concern | Location |
| --- | --- |
| Engine types / state machine | `src/interview/engine/{types,machine}.ts` |
| Turn loop (the brain logic) | `src/interview/engine/loop.ts` (`advance`, `initState`) |
| Judge / adapt / evidence / phrases | `src/interview/engine/{judge,adapt,evidence,phrases,core}.ts` |
| Subject pack (Clara, strands, watchlist) | `src/interview/subjects/maths/pack.ts` |
| Question bank (tiered JSON folders) | `src/interview/bank/questions/maths/<topic>/<difficulty>.json` |
| Selection (RNG, no-repeat, fallback) | `src/interview/bank/select.ts` |
| Edge brain (per turn) | `supabase/functions/interview-brain/index.ts` (+ vendored `_shared/`) |
| Vendoring + combined bank | `scripts/build-interview-brain.mjs` (`npm run brain:build`, auto-run on `prebuild`) |
| Client turn loop | `src/hooks/useInterviewSession.ts` (engine-driven branch) |
| Brain client | `src/api/interviewBrain.ts` |
| Mode/topic setup UI | `src/components/InterviewSetup.tsx` |
| Skip / switch-topic controls | `src/components/InterviewControls.tsx` |
| DB state + review columns | `supabase/migrations/20260618000001_interview_engine_state.sql` |
| Feedback (evidence scoring + review) | `supabase/functions/generate-interview-feedback/index.ts` |
| Questions review UI | `src/components/InterviewFeedback.tsx` |

Unit tests: `src/interview/**/__tests__` (`npm run test:run`). The engine is pure (the LLM judge is
injected) so it is fully covered headless with fakes.

## Deploy checklist

1. `supabase db push` (or apply `20260618000001_interview_engine_state.sql`) — adds
   `interview_sessions.{mode,subject,engine_state,evidence}` and `feedback.questions_review`.
2. `npm run brain:build` — vendors the engine into the function (CI/`prebuild` does this too).
3. Deploy edge functions: `supabase functions deploy interview-brain get-anam-session-token generate-interview-feedback`.
4. Secrets the brain needs: `OPENAI_API_KEY` (judge — gpt‑4o‑mini), plus the existing
   `SUPABASE_*` and `ANAM_API_KEY`.

## Phase 0 spike — verify the puppeteer loop (do this first on a real Anam account)

The one unproven assumption is that an Anam persona with **no brain** stays silent so our `talk()`
is the only voice. Verify before relying on it:

1. Start the **11+ Maths Mock Interview**, choose Mock, click Start. Watch the browser console.
2. **Auto-reply suppression:** the avatar should ONLY speak lines our brain returns (you'll see
   `Brain turn` logs). If the avatar *also* answers on its own, Anam rejected/ignored the brain-less
   persona → apply the fallback below.
3. **End-of-turn:** after you stop speaking, a `MESSAGE_STREAM_EVENT_RECEIVED` with
   `endOfSpeech: true` should fire and trigger the next brain turn. If turns don't advance, the
   debounce/STT signal needs tuning (see `handleStudentTurn` in `useInterviewSession.ts`).
4. **Latency:** time student-stops → avatar-speaks. ~1–2s is expected; if it feels long, have the
   client `talk()` an instant filler ("Okay, let me see…") before awaiting the brain.

**Fallback if Anam won't run brain-less:** in `get-anam-session-token`, instead of deleting
`brainType`, keep a brain but give it a hard "never speak unless explicitly told" system prompt, and
verify it stays quiet. The client already sends a silent-puppet `systemPrompt`; switch the function
to retain a neutered brain if needed. (`engineDriven` branch is the single place to change.)

## End-to-end test

Start a Maths Mock → answer two questions → **Skip** one (button or say "skip") → answer one wrong
(take the hint, retry) → finish. Expect:
- Questions differ from a previous run (randomised selection).
- Feedback shows a **Questions** section: skipped item flagged, your answers shown, a note per item.
- `interview_sessions.evidence` populated; `feedback.questions_review` saved.

## Extending

- **More maths questions:** drop them into `src/interview/bank/questions/maths/<topic>/<difficulty>.json`
  matching `BankQuestion` (`src/interview/bank/schema.ts`). Keep `topic` = folder, `difficulty` =
  file. Run `npm run brain:build`. `validateBankFile` (in the data-layer tests) lints the shape.
- **New subject (logic/verbal/current-affairs/general 11+):** author
  `src/interview/subjects/<subject>/pack.ts` + its `bank/questions/<subject>/...` folders, register it
  in `src/interview/subjects/index.ts` and `SUBJECT_BY_TYPE`/`getBank` (+ the brain's bank import),
  set `engineDriven: true` on its config in `src/config/interviewTypes.ts`. The engine itself is
  untouched — that's the payoff of the data-driven design.
