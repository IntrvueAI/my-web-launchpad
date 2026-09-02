# Output 4 — Roleplay system

**Machine-readable:** `data/roleplays.json` — 20 fully specified concepts, 40 hidden facts, 80 endings, all at clinical boundary `NONE`.

Roleplay is the one thing in this build that a question bank cannot become and a competitor cannot ship in a sprint. It is also the thing that fails most obviously when done badly, because a character who does not change in response to the candidate is transparently a prompt in a costume.

---

## The persona specification

A roleplay is not a scenario with a mood attached. It is a small state machine with a person on top. Every persona has fourteen required components:

| Component | What it does | Failure if omitted |
|---|---|---|
| **Persona** | Name, role, age bracket, relationship to the candidate | Generic "a patient"; nothing to build rapport with |
| **Applicant role** | Stated explicitly, including what the candidate has no access to and no authority over | The candidate assumes clinical authority and the station teaches the wrong behaviour |
| **Initial state** | Emotional register and physical framing at t=0 | The actor drifts into whatever the candidate implies |
| **Trajectory** | The rule governing how the state moves — what softens it, what hardens it, and how fast | The actor is either infinitely patient or immovably hostile; both are useless |
| **Opening statement** | Verbatim first line, written to place the candidate under a specific demand | The station starts vague and the assessment starts late |
| **Hidden facts** | Material information the actor will not volunteer, each with an explicit disclosure condition | The station is solvable by talking rather than by listening — the single biggest design failure |
| **Disclosure conditions** | The precise candidate behaviour that unlocks each hidden fact | The AI leaks information to be helpful and destroys the discrimination |
| **Escalation triggers** | Named candidate behaviours that make the actor worse | Escalation becomes arbitrary and feels unfair |
| **De-escalation triggers** | Named behaviours that make the actor better | Nothing the candidate does matters |
| **Resistance patterns** | How the actor pushes back, deflects and tests | The candidate succeeds on the first attempt and learns nothing |
| **Interruption rule** | When and whether the actor cuts across, with a timing condition | Either constant interruption or none, both unrealistic |
| **Planted misunderstanding** | A wrong belief held by the actor, or invited by the framing | No opportunity to demonstrate checking |
| **Desired outcomes** | The behaviours a strong candidate produces — not the words | Scoring drifts toward phrasing |
| **Endings** | Four outcome states with explicit entry conditions | The station has one script and no consequences |

Plus: red flags, scoring weights, actor response to strong and weak performance, clinical boundary, university fit, and transcript cues for the scorer.

### Hidden information is the whole design

The reason a card that says "the patient is angry" cannot be practised against is that there is nothing to find out. **Forty hidden facts across twenty roleplays, each gated behind a specific behaviour**, is what converts a scenario into an assessment.

Three gating patterns, in ascending difficulty:

1. **Single open question.** RP-002: her sister's diagnosis surfaces if the candidate asks what specifically worries her.
2. **Behaviour plus restraint.** RP-008: the caring responsibility requires *both* an open question *and* the candidate not filling the four-second silence that follows. This is the pattern that most closely mirrors a real MMI actor and is invisible to a transcript-only scorer.
3. **Sequenced unlock.** RP-001: the son's guilt about his mother telling him not to make a fuss is reachable *only after* the anger has already come down — so it is a reward for de-escalation, not a separate task.

**Engineering rule: the model must not volunteer a gated fact under any circumstances, including when the candidate is struggling and helping them would feel kind.** This is the highest-risk failure mode of an LLM actor and needs an explicit constraint in the system prompt plus an eval that measures leak rate.

### How the actor reacts to strong and weak responses

Every persona specifies both, because this is what the candidate learns from. Two examples:

> **RP-003 (Sam, results day) — weak:** shorter answers, looks away, says *"it's fine, honestly"*. That phrase is the actor's designed tell that the station is failing.
> **RP-003 — strong:** looks up, longer sentences, offers the hidden fact about their father without being asked.

> **RP-009 (Ken, health fair) — weak:** presses harder, escalates the informality, and *rewards any hedge with more clinical detail*. The actor actively baits the candidate across the competence line.
> **RP-009 — strong:** accepts the boundary immediately and warmly, and both hidden facts surface.

The pattern is deliberate: **the actor's behaviour is the feedback**, delivered in real time, before any written report. A candidate should be able to feel a station going wrong.

---

## Roleplay taxonomy

Seventeen required categories, all covered. Realism assessment against what a UK medical school applicant can plausibly be asked to do:

| Category | Realistic for an applicant? | Correct framing | Framing that would be wrong |
|---|---|---|---|
| **Anxiety** | Yes | A person anxious about a wait, a result they have not had, a first day | Explaining a diagnosis or interpreting a result |
| **Anger** | Yes — very common | Anger at a delay, a cancellation, poor communication, a broken promise | Anger about a clinical decision the candidate would have to defend |
| **Distress** | Yes | A peer after results, a relative after bad news already delivered by someone else | The candidate delivering the news that caused the distress |
| **Embarrassment** | Yes | Continence, literacy, money, a mistake, needing help with something ordinary | Anything requiring physical examination |
| **Grief** | Yes, with care | Sitting with someone already bereaved, at a support group or as a friend | Breaking news of a death — outside any applicant role |
| **Confusion** | Yes | Repeated questions, disorientation, misunderstanding an arrangement | Assessing cognition or capacity formally |
| **Mistrust** | Yes | A parent who has been dismissed before, someone who distrusts an institution | Requiring the candidate to argue clinical evidence |
| **Reluctance to disclose** | Yes — the highest-value category | A teammate, a friend, a colleague, a carer | A patient concealing symptoms, which invites history-taking |
| **Unrealistic demands** | Yes | Demands for information, speed, guarantees, or clinical advice | Demands the candidate could legitimately meet if qualified |
| **Confidentiality conflicts** | Yes | A friend's disclosure, a relative asking, a group chat | Requiring GMC-level knowledge as the pass condition |
| **Safeguarding** | Yes, with strict limits | A disclosure in a volunteering or school setting; escalation to a named lead | Recognising clinical signs of abuse; conducting any investigation |
| **Peer misconduct** | Yes | Cheating, fabricated experience, unsafe shortcuts | Reporting a doctor's clinical error |
| **Team conflict** | Yes | Group projects, teams, shifts, rotas | Conflict over clinical management |
| **Discriminatory comments** | Yes | An offhand remark by a colleague or a senior | Requiring the candidate to adjudicate a formal complaint |
| **Mistakes and candour** | Yes | A message not passed on, something lost or broken, a wrong item given | A clinical error with patient harm |
| **Concerns about a colleague** | Yes | Tiredness, distraction, an error, apparent distress | Diagnosing a colleague's health condition |
| **Situations beyond competence** | Yes — the canonical station | Being asked for medical advice and declining | Any station where giving advice is the pass |

### Stations that would incorrectly require clinical expertise — do not build

| Do not build | Why |
|---|---|
| Breaking a diagnosis or a prognosis to a patient | No applicant role permits it; it rewards pretending to be a doctor |
| Explaining treatment options or obtaining consent for a procedure | Requires clinical knowledge; consent is a dialogue about options the candidate cannot know |
| Taking a history to determine what is wrong | Trains exactly the behaviour that scores as a red flag in RP-009 |
| Managing a deteriorating patient | Not an applicant scenario in any format |
| Discussing a medication, a dose or a side-effect profile | Clinical content with no legitimate applicant framing |
| Telling a relative someone has died | Outside any plausible applicant role |
| Assessing capacity formally | The Mental Capacity Act two-stage test is a professional act |
| Adjudicating a clinical disagreement between professionals | Requires clinical judgement to resolve |

The honest reframe in each case keeps the *interpersonal* demand and removes the *clinical* one. "Break bad news to a patient" becomes "tell a parent the session is cancelled and their journey was wasted" (RP-018) — same warning shot, same pause, same anger management, same need for a concrete remedy, and no pretending.

---

## The twenty concepts

| ID | Title | Category | Context | Actor | Band | Central test |
|---|---|---|---|---|---|---|
| RP-001 | The relative who has been waiting | Anger, unrealistic demands | Hospital | Son | Stretch | Acknowledge before explaining; refuse clinical speculation under pressure |
| RP-002 | Before the results | Anxiety | GP practice | Patient | Standard | Hold the competence line without abandoning her |
| RP-003 | Results day | Distress | School | Friend | Standard | Tolerate refused comfort; use silence; no early solutions |
| RP-004 | The spilled tea | Embarrassment | Care home | Resident | Standard | Preserve dignity without forcing an admission |
| RP-005 | The bereavement group | Grief | Community | Widow | Stretch | Answer honestly; ask about the person who died; no platitudes |
| RP-006 | The same question, again | Confusion | Care home | Resident | Standard | Address the feeling, not the fact; don't argue or lie |
| RP-007 | The consent form | Mistrust | School | Parent | Stretch | Don't persuade; elicit the real concern; make no clinical claims |
| RP-008 | The teammate who stopped turning up | Reluctance to disclose, team conflict | Sport | Peer | Stretch | Curiosity before correction; survive two deflections; don't fill the silence |
| RP-009 | Just tell me what you'd do | Beyond competence | Community | Member of the public | Standard | Decline warmly, take no history, find the real issue |
| RP-010 | The lift home | Confidentiality conflict | School | Friend | Stretch | Don't promise; don't lecture; focus on the future risk to others |
| RP-011 | The bruise | Safeguarding | Volunteering | Child | Stretch | Answer the confidentiality question honestly; investigate nothing |
| RP-012 | The fabricated placement | Peer misconduct | School | Fellow applicant | Stretch | Speak to him first; offer a route; state your position without threat |
| RP-013 | The group project | Team conflict | School | Peer | Stretch | The candidate is in the wrong; apologise without 'but' |
| RP-014 | The remark in the kitchen | Discriminatory comments | Care home | Senior colleague | Stretch | Challenge the phrase, not the person, across a seniority gap |
| RP-015 | The message I forgot to pass on | Candour | Care home | Daughter | Standard | Say "it was me" before being asked twice |
| RP-016 | The colleague who isn't right | Concern about a colleague | Workplace | Colleague | Stretch | Concern before accusation; ask a third time; don't promise silence |
| RP-017 | The supervisor's shortcut | Challenging upwards | Volunteering | Supervisor | Stretch | Neither comply nor refuse; propose something workable |
| RP-018 | Cancelled again | Anger | Community | Parent | Standard | Acknowledge before explaining; commit to a specific change |
| RP-019 | Describe it to me | Misunderstanding | School | Peer | Standard | Open checking, not "does that make sense?" |
| RP-020 | The thing about my dad | Reluctance to disclose, distress, beyond competence | Care home | Carer | **Adversarial** | Hold two readings at once: she needs support, and someone must know |

Distribution: 6 school · 5 care home · 3 community · 2 volunteering · 1 each hospital, GP, sport, workplace. **Only two of twenty are set in clinical environments**, and in both the candidate is explicitly a volunteer with no access and no authority. This is deliberate — the school, care home and community settings are more realistic for a 17-year-old, more discriminating, and impossible to pass by reciting guidance.

RP-020 is labelled `4_adversarial` and its `university_fit` is *diagnostic use only*. **Flag it in the UI as harder than a real MMI station**, or users will conclude real interviews are like this and calibrate their preparation wrongly.

---

## Design principles worth stating explicitly

**1. The candidate is often the one in the wrong.** RP-013 opens with the candidate having gone behind a teammate's back; RP-015 opens with an error the candidate made. Most commercial roleplay content casts the applicant as the reasonable party managing someone else's unreasonableness. Real professionalism stations do the opposite, and being wrong is where candour and apology become assessable.

**2. The actor's anger is frequently legitimate.** RP-018's parent has made a wasted journey with a disabled child for the third time this term. She is right. A station where the actor is unreasonable teaches the candidate to manage difficult people; a station where the actor is right teaches them to take responsibility.

**3. Refusal is rewarded, and refusal alone is not.** Across RP-002, RP-007, RP-009 and RP-020, declining to give clinical advice is necessary but never sufficient. Each has an ending state where the boundary is held coldly and the candidate still fails, because the person was abandoned. Aston publishes "Knowing your limitations and knowing when to ask for help" as an assessed attribute — the *and* is doing the work.

**4. Promising confidentiality is the most common red flag in the set** — RP-004, RP-008, RP-010, RP-011, RP-016 and RP-020 all have an ending where the candidate promises something they cannot deliver. This is the single most teachable behaviour in the whole roleplay system, and every one of those stations is winnable by a candidate who interrupts the request before the disclosure completes.

**5. Bait is legitimate; traps are not.** RP-009's actor actively rewards hedging with more clinical detail. That is bait, and it is fair, because declining is available from the first second. A trap would be a station where the pass condition is unknowable — for instance requiring a candidate to know a statutory test. Nothing in the set does that.

---

## Engineering requirements

| Requirement | Why | How to verify |
|---|---|---|
| **Zero disclosure leakage** | An actor that helps a struggling candidate destroys the assessment | Eval: run 50 sessions per station; measure the rate of hidden facts revealed without the disclosure condition being met. Target < 2%. |
| **State persistence within the station** | The trajectory is the product | Eval: verify the actor's register at t=0, t=mid and t=end differs measurably along the specified trajectory |
| **Trigger fidelity** | Escalation must be caused, not random | Eval: inject each escalation trigger deliberately; confirm the state moves. Then inject each de-escalation trigger; confirm it moves back. |
| **Ending classification** | Feedback depends on which ending was reached | The ending is a scored output, not narrative colour. Log it. |
| **Interruption timing** | Specified per station in seconds | Deterministic timer, not model judgement |
| **Staying in character under provocation** | Candidates will try to break the roleplay | Eval: attempt to elicit meta-commentary, ask the actor to score the candidate, ask for the hidden facts directly |
| **Never giving clinical advice in role** | The actor asking is fine; the actor answering is not | Safety eval on every persona |
| **Time-out with a close** | Real stations end mid-sentence | The actor must handle the bell, and the candidate's ability to close is scored |

**Do not build video or avatar personas.** Voice with a named character carries the entire assessment value. Video adds cost, adds an implicit claim to assess non-verbal behaviour that we have decided not to make, and invites the comparison with human actors that we lose.
