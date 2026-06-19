# Interview scripts — your source-of-truth question documents

**Put your `.md` interview scripts here**, one (or more) per subject, in the subfolders below:

```
interview-scripts/
  maths/             ← drop maths scripts here
  logic/             ← drop logic & reasoning scripts here
  current-affairs/   ← drop current affairs & moral scripts here
```

## How it works

These `.md` files are the **human source of truth** — written by you, in the 6-part format (see
the Logic & Reasoning script as the model). The interview engine does **not** read `.md` directly;
it reads structured JSON in `src/interview/bank/questions/<subject>/<topic>/<difficulty>.json`.

So the workflow is:

1. **You** write/drop a `.md` script in the right subject folder here (or just paste it in chat).
2. **I** convert it into the bank JSON, validate it, and wire up the subject if it's new.
3. `npm run brain:build` re-bundles the bank → deploy → Clara is asking the new questions.

You never have to touch JSON.

## The 6-part format each question should follow

1. **The question** — read verbatim.
2. **Model reasoning path** — how a top candidate thinks it through (a process, not just an answer).
3. **Scoring rubric** — Strong / Developing / Weak bands (+ a final-answer note).
4. **Common mistakes** — the wrong turns to watch for and what each reveals.
5. **Live probes** — exact follow-up lines + what a good response sounds like.
6. **Hints if stuck** — a three-step ladder, gentle nudge → near-reveal.

Plus, at the top of each subject's doc, the **document-level rules** (the golden rule, the
qualities being assessed, the band definitions, how hints affect banding) — these become the
subject's scoring philosophy. The Logic & Reasoning script is the reference template.

## Subject status

- **maths** — engine-driven (currently sample questions; replace with your real bank).
- **logic** — engine-driven (16 questions loaded; send C5 onward to finish the doc).
- **current-affairs** — not yet an engine subject; dropping a script here is the trigger to stand it up.
