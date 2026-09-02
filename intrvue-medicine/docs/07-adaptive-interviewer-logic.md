# Output 7 — Adaptive interviewer logic

The tester's most precise criticism was buried in praise: *"if it interrupts you, though not always, it will let you carry on."* The interruption is inconsistent, which means it is not currently governed by a rule. This document is the rule.

---

## The governing principle

**Probe the reasoning, not the vocabulary.**

A follow-up is justified when the *reasoning* is incomplete, unsupported, unsafe, one-sided, or good enough to deserve harder work. It is not justified because an expected phrase is missing. The distinction is operational: `expected_content` items describe **considerations**, and the trigger fires on the absence of the consideration, evaluated semantically, not on the absence of a string.

Concretely: a candidate who says *"I'd tell the person whose job it is to deal with this — at my school that's Mrs Okafor, she's the safeguarding lead"* has met the escalation point in full. A keyword matcher looking for "designated safeguarding lead" would interrupt them. That is the bug.

**Budget: a maximum of three follow-ups per station, one at a time, and never more than one on the same weakness.** Real interviewers move on.

---

## The five interviewer behaviours, and which are legitimate

| Behaviour | Definition | Legitimate? | Rule |
|---|---|---|---|
| **Useful challenge** | Pressure that requires the candidate to do more reasoning without supplying any | ✔ Always | The default mode |
| **Realistic probing** | Asking for specificity, evidence or a next step, as a real interviewer would | ✔ Always | Unlimited within the budget |
| **Unnecessary interruption** | Cutting across a coherent answer in progress | ✘ Never | Only interrupt on time, or on sustained serious drift after 45s |
| **Leading** | Any prompt containing the content being tested | ✘ Never | Enforced by `adaptive.do_not_lead` |
| **Correcting misinformation** | Stating a fact the candidate got wrong | ✔ But **after** the station, never during — with one exception | See below |

### The correction exception

Factual correction **during** a station is permitted in exactly one case: **an unsafe belief that would cause harm if acted on and that will contaminate the rest of the station.** "You don't need to report a safeguarding concern unless you're sure" is that case. "The waiting list is 9 million" is not — that goes in the feedback.

The correction is delivered as a question with the fact embedded, never as a lecture, and never in a way that scores the candidate down for the original error twice:

> *"Just to check one thing — do you think you'd need to be certain before saying something?"*

Everything else waits. Correcting mid-answer destroys the assessment, because the rest of the station is then measuring how the candidate responds to being corrected rather than what they would have said.

### The interruption rule, precisely

Interrupt only when one of these is true:

1. **Time.** The station clock has expired, or is within 20 seconds of expiring and the candidate is mid-paragraph. Interrupting on time is realistic and required — real stations end mid-sentence, and closing under the bell is a scored behaviour.
2. **Sustained serious drift.** More than 45 continuous seconds not addressing the question, *and* the answer shows no sign of returning. Redirect once, gently: *"Can I bring you back to..."*
3. **Roleplay in character**, where the persona's `interruption_rule` specifies a timed interjection.

Never interrupt because a point is missing. Missing points are what follow-ups are for, and follow-ups come after the candidate has finished.

---

## Branching logic

Eleven triggers. Each has a detection rule, a probe pattern, a `do_not_supply` constraint and an escalation path. Confidence threshold 0.7 by default — below that, do not fire.

### 1. Incomplete answer — a required consideration is absent

**Detect:** an `expected_content` item with `necessity: required` has no semantic match in the transcript, and the candidate has stopped speaking.
**Probe:** open first, then narrowing, never naming the missing content.

> Tier 1: *"Is there anything else you'd want to think about here?"*
> Tier 2: *"You've talked about what you'd say to her. Is there anyone else involved in this?"*
> Tier 3 (final): *"What happens after that conversation?"*

**Never:** *"What about safeguarding?"* — that awards the mark to the interviewer.
**Escalation:** at most two tiers. If Tier 2 fails, record the gap and move on. A third attempt becomes leading.

### 2. Rehearsed or generic answer

**Detect:** answer is fluent, well-structured, contains category-level language ("communication is vital in medicine", "teamwork is essential") and **no specific instance** — no named event, no time, no place, no consequence. High fluency with low specificity is the signature.
**Probe:** demand an instance.

> *"Take me to one specific occasion. Where were you, and what did you actually do?"*
> *"When did that last happen?"*

**Escalation:** if the second attempt produces another generality, stop and record. Do not badger — some candidates freeze, and freezing under repeated pressure is not the thing being measured.
**Note:** rehearsal is not itself a failure. A rehearsed answer that contains real evidence is a good answer prepared well. Only *evidence-free* fluency is the finding.

### 3. Unsupported claim

**Detect:** a trait or capability asserted without evidence — "I'm very resilient", "I work well under pressure", "I'm a good listener".
**Probe:** automatic and immediate on the next turn.

> *"What's your evidence for that?"*
> *"Give me an example where that was tested and it was hard."*

**Then:** check whether the example actually evidences the claimed trait, which is where most candidates fail. If it does not, one further probe: *"What in that example shows resilience rather than persistence?"*

### 4. Failure to address the question

**Detect:** the answer is coherent and substantive but on an adjacent topic. Distinguish from drift — drift wanders, this one commits confidently to the wrong question.
**Probe:** redirect once, explicitly, without prejudice.

> *"That's the background — but the question was whether the act of striking itself is defensible."*

**Escalation:** if the redirect fails, record it and move on. Score under S1, not S2.

### 5. Ethically unsafe answer

**Detect:** the candidate proposes an action that would cause harm — promising confidentiality to a safeguarding disclosure, deciding not to report because they cannot be certain, agreeing to conceal an error, investigating a disclosure themselves.
**Probe:** priority 1, fires immediately, non-leading but pointed.

> *"You've said you'd keep that between you. Is there anything that would change that?"*
> *"You said you'd wait until you were sure. What if you're never sure?"*

**Escalation:** if the second probe does not shift it, stop probing. Record a **serious red flag** and address it fully in the feedback with the actual standard — GMC "Raising and acting on concerns" para 10: justified on reasonable belief *even if you are mistaken*. **The station is not failed by the initial error; it is failed by not moving after being given the opportunity.** Feedback must say which.

### 6. Overconfident clinical claim

**Detect:** a diagnosis, treatment, drug, prognosis, or a reassurance about a clinical matter — or a candidate taking a symptom history.
**Probe:** priority 1. In roleplay, the persona presses *in character* rather than breaking frame.

> Roleplay: *"So you think something has gone wrong?"* / *"Go on, off the record, what would you do?"*
> Non-roleplay: *"You're a sixth-form student at this point. What can you actually say to them?"*

**Escalation:** none. One probe. If the candidate holds the claim, it is a red flag. If they withdraw it and redirect, that recovery counts and should be credited in the feedback — recognising an overreach and correcting it is itself the assessed behaviour.

### 7. Shallow reflection

**Detect:** work-experience or personal-example answers that narrate events and stop, or that conclude "it confirmed my desire to do medicine".
**Probe:** three patterns in escalating order.

> *"What did that change about how you'd do it next time?"*
> *"What did you get wrong?"*
> *"What surprised you?"* — often the most productive of the three

**Never:** *"What did you learn about communication?"* — that supplies the category and guarantees a category-level answer.

### 8. One-sided current-affairs argument

**Detect:** a policy or ethics answer that argues one direction with no serious engagement of the other, or that presents the opposing case as a strawman.
**Probe:** **symmetric.** The probe must be generated against whichever side the candidate took, and must be of equal force.

> Argued for strike action → *"A patient whose cancer surgery was cancelled had no part in this dispute. What would you say to them?"*
> Argued against → *"If pay erosion drives people out over ten years, is that not also patient harm?"*

**Measure this.** Across a large sample the ratio of challenge-to-position should be near 1:1. An interviewer that pushes harder on one side is signalling a position, and on industrial action, private provision and international recruitment that is a real risk. See Output 5.
**Never:** mark down a defensible position. Score the reasoning and the fairness of the opposing case, never the conclusion.

### 9. Failure to recognise emotion

**Detect (roleplay only):** an emotional cue was delivered and the candidate proceeded to task or information without acknowledgement.
**Probe:** in character, by escalating the cue rather than asking a question.

> *"You haven't actually said anything about the fact we've been here since seven."*

**Escalation:** one escalation. If still unacknowledged, the persona's weak-response trajectory takes over and the ending state records it. **Do not break frame to ask "how do you think he's feeling?"** — that converts a behavioural assessment into a knowledge question, which is a different and easier test.

### 10. Failure to escalate

**Detect:** an action is described but stops at one step — "I'd tell someone senior" — with no named person and no contingency.
**Probe:** two questions, both essential, and this is the most under-used pair in the market.

> *"Who, specifically?"*
> *"Two weeks later nothing has changed. What now?"*

The second is the discriminator. Most candidates have an answer to the first and none to the second.

### 11. Strong answer

**Detect:** all required content covered, evidence present, both sides engaged, within time. **This must have a branch** — otherwise strong candidates get an easy ride and the product provides them no value.
**Probe:** raise a difficulty variable rather than asking more of the same.

| Raise | Probe pattern |
|---|---|
| `HOSTILE` | *"I'm not convinced. Someone senior tells you you're overreacting. Now what?"* |
| `ETHUNC` | *"Change one fact: the person asking is fifteen. Does your answer hold?"* |
| `CONFL` | *"Suppose acting on that means breaking a promise you made. Which gives way?"* |
| `LIMITS` | *"You've handled that well. Where would your competence run out?"* |
| Meta | *"What would have to be true for you to change your position?"* |

The last is the single most discriminating follow-up available across every domain, and the cheapest to implement.

---

## What the interviewer must never do

| Never | Why |
|---|---|
| Name the missing content in a probe | Awards the mark to the interviewer |
| Interrupt because a keyword is absent | The tester's exact complaint, and the commonest AI-interviewer failure |
| Ask more than three follow-ups | Interrogation is not interviewing |
| Fire two probes on the same weakness beyond the escalation ladder | Badgering; freezing is not the thing measured |
| Signal approval or disapproval mid-station | Changes what the candidate says next and contaminates the assessment |
| Correct a non-safety-critical fact during the station | The rest of the station then measures reaction to correction |
| Reveal hidden information to help a struggling candidate | Destroys the assessment; measure the leak rate |
| Push harder on one side of a contested question | Signals a position |
| Penalise a genuine "I don't know" that is followed by a method | Score the method — this is an explicit ontology rule |
| Ask the candidate about their own health, or a family member's condition | Wellbeing rule, enforced at station level |

---

## Turn-taking, and the "let it carry on" behaviour

The tester noticed the recovery behaviour and liked it. Make it deterministic:

1. **Silence is not a turn.** Wait 2.5 seconds after the candidate stops before speaking; 4 seconds in emotional roleplay, where silence is itself the assessed behaviour. Filling a silence the candidate should have used is a scoring error the interviewer commits, not the candidate.
2. **Barge-in returns the floor.** If the candidate speaks while the interviewer is speaking, stop within 300ms and yield. Do not repeat the prompt from the beginning.
3. **After a time interruption, offer the close.** *"We're out of time on this one — anything you want to add in a sentence?"* Real MMI stations do this, and it lets a good candidate demonstrate closing under pressure.
4. **Never resume an abandoned probe.** If the candidate went somewhere more interesting, follow them.

## Calibration: how to know the logic is right

| Metric | Target | Signal if wrong |
|---|---|---|
| Follow-ups per station | 1.5–2.5 mean | >3 means the triggers are too sensitive |
| Interruptions not caused by time | < 5% of stations | The tester's complaint recurring |
| Leading-content leak rate | < 1% | Sample probes against `do_not_lead` |
| Challenge symmetry on contested topics | 0.9–1.1 | Political signalling |
| Strong-answer branch fire rate | ≥ 25% of top-quartile performances | Strong users getting no value |
| User dispute rate on follow-ups | < 3% | Probes feel unfair or arbitrary |
| Hidden-fact leak rate (roleplay) | < 2% | The actor is being helpful |

**Build the first three as evals before the feature ships, not after.** Each is a scripted transcript replayed against the interviewer with an expected behaviour — cheap to write, and they are the only defence against a regression that makes the product feel worse in a way nobody can name.
