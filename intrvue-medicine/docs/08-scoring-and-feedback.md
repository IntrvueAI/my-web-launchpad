# Output 8 — Scoring and feedback framework

**Machine-readable:** `data/scoring-rubrics.json`.

## The model, and why it is evidenced rather than invented

Six UK medical schools publish enough of their scoring to compare. They converge on the same three-part structure independently:

| School | Published model |
|---|---|
| **Imperial** | 6 marks content + 4 marks communication, per station |
| **ARU** | Quality of answer / demonstration of skills and qualities / communication — 5 each, 15 per station, 90 total |
| **Aberdeen** | A domain score per station, **plus** communication and interpersonal skills scored independently *at every station regardless of its domain* |
| **Sheffield** | Five-point scale (Excellent → Unsatisfactory) across eight named sections, with a published rule that **applicants scoring 3 or better in every section are prioritised** |
| **BSMS** | Five band descriptors, then a numeric score out of 20 per station |
| **Plymouth** | A numeric scale **plus a separate binary red-flag field** for unsuitable behaviour or statements |

The convergent design: **a domain score, a communication score on every station regardless of domain, and a separate binary red flag.** We adopt it, plus Sheffield's per-station floor.

## Structure

**Two always-scored dimensions, six domain dimensions, one binary.** Five-point scale, Sheffield's labels.

| | Dimension | Scored on | Notes |
|---|---|---|---|
| **S1** | Content and coverage | Every station | Absence of any `required` item caps S1 at 2 |
| **S2** | Communication and delivery | Every station | Accent, dialect and non-native speech patterns explicitly not scored |
| S3 | Reasoning quality | ES, PD, AD, DI, PR | Never scores the conclusion |
| S4 | Insight and reflection | PE, WE, AC | Quantity of experience never scored |
| S5 | Empathy and person-centredness | RP, EX | Partly interactive-only |
| S6 | Professional judgement | ES, RP, PR, AC, GT | Named role appropriate to the *setting* |
| S7 | Numeracy and data handling | CA, DI | Limitations weighted above arithmetic |
| S8 | Scientific reasoning | SP (Oxbridge only) | Reasoning path, not answer |
| **S9** | **Red flag** | Every station | Binary + severity. Never averaged away |

**The floor rule is the most useful output.** Sheffield prioritises candidates scoring 3+ in *every* section. So a total is the least informative thing we can report, and *"you scored well overall but fell below satisfactory on professional judgement in three of six stations"* is the most informative. Report the floor before the total.

## What is shared and what needs format-specific rubrics

**Shared across every format:** S1 and S2, with identical band descriptors. This is what makes cross-format comparison meaningful — a candidate can be told their communication is consistently weaker in roleplay than in direct questions, which is actionable, and only possible because the same rubric is applied.

**Format-specific, because the same word means different things:**

| Format | What differs |
|---|---|
| **PR — prioritisation** | **The order is not scored.** Two defensible orders both score top band. Score the criterion, the defence, and willingness to revise when a fact changes mid-station. A rubric that scores the order is scoring the answer key, not the judgement. |
| **CA — calculation** | Method transparency allows partial credit and mirrors how these stations are marked. Must support Leicester's model, where numeracy is a **pass-mark hurdle** rather than a contribution to a total. |
| **DI — data interpretation** | Stating what the data cannot show is weighted **above** arithmetic accuracy. A candidate who miscalculates but spots the missing denominator outscores one who calculates perfectly and draws an unsupported conclusion. |
| **RP — roleplay** | S5 dominates and is partly interactive-only. The **ending state reached is itself a scored output**, logged alongside the dimension scores. |
| **IT / EX** | S2 dominates, and it is scored on whether the *listener understood*, not whether the candidate was fluent. Open checking only — "does that make sense?" returns "yes" regardless and therefore scores nothing. |
| **PD — policy discussion** | Balance is scored; the position is not. Factual precision expected only at the level the current-affairs topic's `baseline_knowledge` specifies — no more. |
| **SP — scientific problem** | Reasoning path, explicitly not the answer. An incorrect conclusion reached by good reasoning outscores a correct one asserted. |
| **GT — group task** | Individually assessed within the group, as KMMS and HYMS do. **Airtime is not a proxy for contribution.** |
| **AR — asynchronous** | All interactive-only components suppressed **and the suppression disclosed**. Adds self-timing and whether the answer concluded. |

## Anti-buzzword enforcement

This is a mechanism, not a policy statement. The schema's `counts_only_if_applied` flag, set true on a defined list, makes naming score **zero**:

- The four principles of biomedical ethics
- The Mental Capacity Act and its five principles
- NHS Constitution values
- The duty of candour
- The inverse care law
- "Correlation does not imply causation"
- "There are two sides to this"

The justification is not stylistic. **Gillon's canonical defence of principlism had to quote and rebut the criticism that it is "a useful 'checklist' approach to bioethics for those new to the field."** A rubric that awards marks for reciting the four principles is rewarding precisely the thing the framework's own leading defender had to write a paper to excuse. The discriminating move is naming which two conflict *here* and what would make one give way — which is exactly what S3 band 4 and 5 describe.

Applied, a candidate scores. Named, they score nothing and the feedback says so explicitly: *"You named autonomy, beneficence, non-maleficence and justice. You didn't say which of them are actually in tension in this scenario. At 1:47 you said 'we have to respect her autonomy' — respect it against what?"*

## The feedback contract

Every feedback item answers six questions, in order. **An item missing any of the six is rejected by the generator** — this is a validation rule, not a style guide.

| Element | Rule |
|---|---|
| **What you did** | Quote or closely paraphrase the actual words, with a timestamp |
| **Why it helped or harmed** | The consequence for the assessment or the other person — never "because the rule says" |
| **What you omitted** | The specific consideration from `expected_content`. Never "you could have said more" |
| **What to do differently** | A behaviour, not an adjective |
| **One worked example** | A single sentence, explicitly labelled an illustration, not a model answer to memorise |
| **Issue type** | KNOWLEDGE / REASONING / COMMUNICATION / DELIVERY |

**The issue-type classification is the field that makes the feedback useful.** The same surface failure has four different remedies:

> A candidate omitted escalation.
> — They did not know a school has a Designated Safeguarding Lead → **KNOWLEDGE**. Remedy: read one page.
> — They knew and did not think to apply it → **REASONING**. Remedy: practise ES stations with `SAFEG` set.
> — They thought it and said it so vaguely it did not register → **COMMUNICATION**. Remedy: practise naming the specific role.
> — They were going to say it and ran out of time → **DELIVERY**. Remedy: practise front-loading under a shorter clock.

Telling all four "you omitted escalation" is the generic feedback the brief forbids. Nobody in the market classifies this way, and it is close to free once the transcript and the timing are already held.

### Banned outputs

"Be more empathetic" · "structure your answer better" · "try to be more confident" · "you should have mentioned the four principles" · "good answer" with no specific · "consider using a framework" · "the correct answer was X" for any ethical scenario · **"you would/wouldn't get in"** · **"successful applicants usually say…"**

The last two are the commercially tempting ones and the two that would do most damage. There is no verified evidence that interview coaching produces offers, and the provider success figures in this market — 94%, 93%, 98% — are uncontrolled post-hoc surveys of candidates who were already shortlisted. We have no comparison cohort and inventing one would be dishonest.

## Full mock aggregation

Six outputs, in this order:

1. **Per-station scores** — the primary output
2. **Per-dimension profile** — mean by dimension across the circuit. *This is the thing a human mock cannot give*, because it only sees one sitting
3. **Floor report** — every dimension below 3, named, per Sheffield's rule
4. **Red flag report** — with severity and the transcript quote, separate from any total
5. **Consistency index** — variance across stations. MMI is designed so one bad station does not sink you; consistent mediocrity does
6. **Circuit total** — reported **last**, with a caveat. Users over-weight it and it is the least informative number we produce

**Never produced:** a percentage likelihood of an offer; a comparison against "successful applicants"; a single grade collapsing the profile.

## Where wrong feedback is most likely, and the mitigations

| Risk | Mitigation |
|---|---|
| **Scoring a defensible ethical conclusion as wrong** | S3 scores reasoning only. Every ES/PD station carries `model_answer_principles`, never a model answer. Contested topics are eval-tested for symmetric challenge. |
| **Penalising a candidate for not knowing statute** | `premed_appropriate: reward_only` on the seven conditional topics. The scorer may add marks, never subtract. |
| **Rewarding vocabulary** | `counts_only_if_applied`. Additionally: sample transcripts scoring in the top band, and check that removing every framework name does not change the score. |
| **Stale facts producing wrong corrections** | Hard `current_affairs_expiry`; withholding, not flagging. |
| **Assessing what we cannot measure** | `interactive_only` suppression, disclosed to the user. No video, no eye contact, no warmth. |
| **Feedback that reads as templated** | `user_dispute_rate` in analytics is the detector. Review any station above 3%. |
| **Penalising honest uncertainty** | Explicit rule: a genuine "I don't know" followed by a method scores at least Satisfactory on S3. Bluffing under challenge scores 1. |

**One human-review requirement.** Before launch, every station touching safeguarding, capacity, confidentiality, end of life, or carrying `clinical_bait` must pass review by a clinician or a medical educator, recorded in `governance.clinical_review`. That is roughly 40% of the initial library. It is the single most valuable spend in the whole plan, because it is the only thing standing between the product and confidently telling a seventeen-year-old that a correct safeguarding answer is wrong.
