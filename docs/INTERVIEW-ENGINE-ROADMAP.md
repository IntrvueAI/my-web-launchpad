# Interview Engine — Architecture & Roadmap

> Status: proposal / North Star. Pilot subject: **Maths (Clara)**.
> Source of truth for the flow: `Mini interview documents/*-flow.json` + `questions_all.json`.

## 1. The problem with today's design

The current interview is a **static system prompt + Anam's bundled brain**:

- All ~10 questions *and their answers* are baked into one Markdown prompt (`src/prompts/academic/*.md`), composed with `interview-logic.md` at load.
- Anam's `ANAM_GPT_4O_MINI_V1` runs the whole conversation; our backend only mints a session token and scores a transcript afterwards.
- No modes, no topic choice, no adaptivity, no question bank. Answers sit in-context (leakage risk). State lives nowhere.

The flow diagrams describe something the static prompt fundamentally can't do: a **stateful, adaptive, mode-based interview that pulls one question at a time from a graded bank**. So this is a re-architecture, not a tweak.

## 2. Target architecture — the "Interview Brain"

Move the conversation logic into a **stateful orchestration engine on the backend**. Anam is demoted to voice + face I/O via its **custom-LLM / webhook-tools** support (confirmed: `POST /v1/llms`, function calling, "bring your own LLM — Anam handles only the visual avatar").

```
                          ┌───────────────────────────────────────┐
   Student  ◀──speech──▶  │  Anam (STT · avatar · TTS only)        │
                          └───────────────┬───────────────────────┘
                                          │ each turn (custom-LLM webhook)
                                          ▼
                          ┌───────────────────────────────────────┐
                          │  INTERVIEW BRAIN  (our backend)        │
                          │  ┌─────────────────────────────────┐  │
                          │  │ Core loop (state machine)        │  │
                          │  │  = the flow diagram, once        │  │
                          │  └─────────────────────────────────┘  │
                          │  ┌────────────┐  ┌──────────────────┐ │
                          │  │ Subject    │  │ Question-bank    │ │
                          │  │ pack(Maths)│  │ service (folders)│ │
                          │  └────────────┘  └──────────────────┘ │
                          │  ┌─────────────────────────────────┐  │
                          │  │ Evidence log + rubric scoring    │  │
                          │  └─────────────────────────────────┘  │
                          └───────────────┬───────────────────────┘
                                          ▼
                              Supabase DB (session state, evidence)
```

Three clean layers, so subjects are **data, not code**:

1. **Core engine (shared)** — the pipeline every flow shares (they are identical bar persona/topics/watch-list/rubric). Authored once.
2. **Subject pack (per subject)** — persona, 6 topics, watch-list, outcome nuances, rubric target, bank binding.
3. **Question-bank service** — `subject → topic → difficulty` "folders" the engine draws from one at a time, **answers held server-side**.

## 3. Folder skeleton (mirrors the flow diagram)

The project is currently shallow; this gives it a real spine. New top-level `src/interview/` plus a new edge function.

```
src/interview/
  engine/                         # CORE LOOP — 1:1 with the flow nodes
    state/
      machine.ts                  # nodes+edges state machine (the flow graph)
      types.ts                    # SessionState, Turn, Outcome, Evidence
    session/
      lifecycle.ts                # start → persona → guard → greet → structure → wrap → report
      guardrails.ts               # one Q at a time, no answer leakage, age-appropriate
      opener.ts                   # unmarked greeting question (not scored)
    modes/
      practice.ts                 # free: pick a strand, switch anytime
      mock.ts                     # structured: sample all strands, adaptive, time-boxed
    loop/
      ask.ts                      # ask Q(n) — read once, verbatim
      hold.ts                     # hold-to-question + escape valve (attempt + 1 hint)
      probe.ts                    # "talk me through it" — credit working
      judge.ts                    # evaluate → outcome branch
      outcomes.ts                 # o1 correct+method · o2 no-method · o3 wrong→hint+retry
                                  #   · o4 stuck→break down · o5 guessed-untested (logic)
      adapt.ts                    # adaptive difficulty controller (step up / hold / ease)
    scoring/
      evidence.ts                 # silent log: accuracy · method · resilience · clarity
      rubric.ts                   # evidence → rubric section /5  (+ hardest level reached)
  subjects/                       # SUBJECT PACKS — config-as-data (mirror *-flow.json)
    maths/
      persona.ts                  # Clara — warm, British, never reveals the answer
      topics.ts                   # the 6 strands (arithmetic … word problems)
      watchlist.ts                # misreads, wrong operation, place-value slips, …
      rubric.ts                   # → Rubric S2 (Reasoning & Intellectual Agility) /5
      index.ts
    # logic/ verbal/ moral/  ← added after the Maths pilot proves the pattern
  bank/                           # QUESTION-BANK SERVICE — "folders the model calls from"
    questions/
      maths/
        arithmetic/*.json
        fractions-decimals-percent/*.json
        ratio-proportion/*.json
        sequences-algebra/*.json
        geometry-measure/*.json
        word-problems/*.json
    schema.ts                     # question schema + validation (Zod)
    select.ts                     # practice (chosen topic) vs mock (sample+adaptive) picker
    index.ts                      # getQuestion(subject, topic, difficulty); answers never serialised to the avatar

supabase/functions/
  interview-brain/                # the custom-LLM webhook Anam calls each turn
    index.ts                      # turn in → engine.advance() → speech out (+ tool calls)
  get-anam-session-token/         # (exists) now provisions the custom-LLM brain + tools
  generate-interview-feedback/    # (exists) becomes the 'report' node: reads the evidence log
```

Each `loop/` and `session/` file is literally a flow node; `engine/state/machine.ts` holds the edges. The flow JSON can almost be loaded directly as the machine definition.

## 4. State & data model

Extend `interview_sessions` (or a new `interview_runs` table) to hold live engine state:

- `mode` (practice | mock), `current_topic`, `difficulty_level`, `question_index`, `asked_ids[]`
- `evidence` (JSONB): per-question { id, topic, difficulty, outcome, hints_used, method_quality, notes }
- `engine_state` (JSONB): current node + transcript pointer (resumable, and fixes the "stuck active session" class of bug by design)

`generate-interview-feedback` then scores from the **structured evidence log**, not a raw transcript re-parse — cheaper, more reliable, and rubric-aligned.

## 5. Question bank — what needs doing

`questions_all.json` = 197 MCQs (Maths 53 · Non-verbal 50 · Verbal 49 · English-comp 45), all `difficulty: "Standard"`.

1. **Re-fold** into `bank/questions/<subject>/<topic>/` files (the "folders").
2. **Add difficulty tiers** (Foundation / Standard / Stretch) — required for the adaptive `adapt.ts` controller. Today everything is "Standard", so adaptivity has nothing to climb.
3. **Reconcile taxonomy** — bank subjects (Non-verbal, English-comp) don't 1:1 match the flows (Logic, Verbal). Map: Logic ← Non-verbal + lateral/deductive; Verbal comprehension ← English-comp. **Moral has no bank** (discussion-led, no right answers — correct by design).
4. **Clarify the MCQ overlap** — the spoken interview wants *open* questions, but the bank is MCQ with `options[4]`. Those options almost certainly feed the existing **practice-minigame tab**. Decide: one shared bank (interview ignores `options`) vs two banks. Recommend one bank, `options` optional.

## 6. Phased roadmap (pilot Maths first)

**Phase 0 — Foundations (no user-facing change)**
- Scaffold `src/interview/` skeleton above; load `maths-mini-interview-flow.json` into `engine/state/machine.ts`.
- Re-fold the Maths slice of the bank; add difficulty tiers to Maths questions; Zod schema + validation.
- Extend the session table with `mode/topic/difficulty/evidence/engine_state`.

**Phase 1 — Engine runs headless (tested, no avatar yet)**
- Implement the core loop end-to-end for Maths; drive it with text fixtures + unit tests.
- Implement `select.ts` (practice + mock+adaptive) and the evidence log → rubric.

**Phase 2 — Wire to Anam as the custom-LLM brain (Maths live)**
- Build `interview-brain` edge function as Anam's custom-LLM endpoint + register the `next_question` / `log_evidence` webhook tools.
- `get-anam-session-token` provisions the custom brain. Front-end gains a **mode fork** (Practice / Mock) and, in practice mode, a **topic picker** — the two features you asked for.
- `generate-interview-feedback` reads the evidence log.

**Phase 3 — Replicate to Logic, Verbal, Moral**
- Add three subject packs + their bank folders. Engine unchanged — this is the payoff of the data-driven design: each new subject is config, not code.

**Phase 4 (optional) — Cost lever**
- With the brain already server-side, optionally swap Anam-bundled inference for our own STT/LLM/TTS (voice-only tier) — the ~$0.14/min → ~$0.02–0.06/min path discussed separately.

## 7. Open decisions

- **Anam custom-LLM latency** — per-turn webhook adds a hop; needs a latency spike in Phase 2 before committing (fallback: richer prompt-composition with server-swapped system prompts per topic/difficulty).
- **Difficulty tiering** — author new Foundation/Stretch questions, or auto-grade existing ones? (content effort)
- **One bank vs two** (interview vs minigame) — see §5.4.
- **Scoring home** — confirm evidence-log scoring fully replaces transcript re-parsing.

## 8. Why this shape

The four flows are the same machine with different data. Encoding the machine **once** and treating subjects as packs is what turns "the project is shallow" into a real engine: the Maths pilot builds 90% of what Logic/Verbal/Moral need, and every future subject is a folder of config + questions, not a rewrite.
