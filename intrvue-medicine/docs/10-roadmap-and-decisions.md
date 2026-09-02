# Output 10 — Production roadmap, and the closing five-point sections

## Library stages

Sizes are derived from what the ontology and the school map actually demand, not from a round number. Recall the key ratio: **158 topics × six coordinate dimensions means one topic generates 10–30 distinct stations.** Station counts below are therefore about *coordinate coverage*, not about writing 300 unrelated questions.

| | **MVP** | **Strong launch** | **Comprehensive** |
|---|---:|---:|---:|
| Stations (non-roleplay) | 120 | 300 | 650 |
| Roleplay personas | **12** | **28** | **60** |
| Full mock circuits | 3 | 8 | 20 |
| Current-affairs topics | 12 | 22 | 35 |
| University-specific modes | **3** | **8** | **18** |
| Scoring rubrics | S1–S3, S5, S6, S9 + 6 format rubrics | All 9 + 12 format rubrics | All + per-station band overrides |
| Ontology coverage | ~55 of 158 topics | ~110 of 158 | 150+ of 158 |
| Clinical review | 100% of D5 and safeguarding | 100% of D4, D5, D7, all clinical bait | Full library, annual re-review |
| Content review process | Two-person: author + reviewer | Author + reviewer + clinician for flagged | Author + reviewer + clinician + quarterly currency audit |

### MVP — what it must contain, and why those numbers

**12 roleplay personas** is the number at which a user cannot exhaust the differentiator in one sitting, and it is what `roleplays.json` already specifies at ranks 1–12. **120 non-roleplay stations** covers every `necessity: required` consideration across the D2, D4 and D5 topics plus the eight current-affairs discussions the tester named. **Three university modes** — and this is the decision that saves the most time — are not three schools but three *archetypes*: a short-station circuit with reading time (UCL/Leeds/UEA/ARU/QUB, ~30 routes), a short-station circuit with no prep (Aberdeen/Manchester/Bristol/BSMS, ~12 routes), and a panel (Glasgow/QMUL/Keele/Newcastle-A101, ~12 routes). That covers roughly 54 of 68 course-routes on day one.

**12 current-affairs topics:** the eight Tier 3 the tester implied plus the four Tier 1 evergreens. **Six rubrics** because S4, S7 and S8 serve formats not in the MVP.

### Strong launch — what it adds

The asynchronous recorded mode (three routes including Brunel's entire interview, and cheap), the numeracy and data station (five routes, also cheap), the Keele pre-read mode (one route, very cheap, and nobody else offers it), eight named university modes rather than three archetypes, and the full current-affairs register with the quarterly process running.

### Comprehensive — what it adds

Oxbridge academic tutorial (four routes, genuinely separate content, needs a science-reasoning bank), group tasks (seven routes, needs multiple simulated participants, hardest thing in this plan), and per-station band descriptors.

**What is never built at any stage:** Bangor A101's written biomedical exam; Buckingham's in-house assessment; a general medical knowledge quiz; video or eye-contact scoring; a model-answer library; an offer-probability score.

---

## Prioritisation logic

Every item scored against the brief's six criteria. Value and differentiation drive; complexity and maintenance and feedback risk restrain.

| Item | Applicant value | Differentiation | Admissions relevance | Production complexity | Maintenance | Wrong-feedback risk | Verdict |
|---|:--:|:--:|:--:|:--:|:--:|:--:|---|
| **Roleplay engine + 12 personas** | 5 | **5** | 5 (13+ routes confirmed) | 4 | 2 | 3 | **Build first** |
| **Fix follow-up logic** | 5 | 3 | 5 | 2 | 1 | 4 | **Build first** — it is the tester's only criticism and it is cheap |
| **Rewrite scoring to reward reasoning** | 5 | 4 | 5 | 3 | 1 | **5** | **Build first** — highest risk item in the product |
| Current-affairs layer (12 topics) | 4 | 3 | 4 | 2 | **5** | **4** | Build first, with the process |
| Three university archetype modes | 4 | 4 | 5 | 2 | 3 | 2 | Build first |
| Ethics and professionalism stations | 5 | 2 | 5 | 2 | 1 | 4 | Build first |
| Asynchronous recorded mode | 3 | 4 | 2 (3 routes) | 1 | 1 | 1 | Phase 2 — cheapest win available |
| Numeracy and data stations | 3 | 2 | 3 (5 routes) | 2 | 1 | 1 | Phase 2 |
| Keele pre-read mode | 2 | **5** | 1 (1 route) | 1 | 1 | 1 | Phase 2 — trivial and unserved |
| Named university modes (8) | 4 | 4 | 5 | 3 | **4** | 3 | Phase 2 |
| Oxbridge academic tutorial | 3 | 3 | 3 (4 routes) | **5** | 2 | 4 | Phase 3 |
| Group task simulation | 3 | **5** | 3 (7 routes) | **5** | 3 | 3 | Phase 3 |
| General medical knowledge quiz | 1 | 1 | 1 | 2 | 4 | **5** | **Never** |
| Video / non-verbal scoring | 2 | 2 | 2 | 4 | 3 | **5** | **Never** |

Two things fall out. **The three highest-risk items are all about the assessment layer, not the content** — follow-up logic, scoring design, and stale current affairs. And the three cheapest wins in the whole plan (asynchronous mode, numeracy, Keele pre-read) are Phase 2 only because they are not differentiating on their own, not because they are hard.

---

## Twelve-week production roadmap

Assumes a small team: one content lead, one or two content writers, one engineer on the assessment layer, and a clinician or medical educator on retainer for review. Weeks are calendar weeks from a start today, 29 August 2026 — which puts the launch-ready date in mid-November, **inside the interview season** (invitations from late November, Nottingham interviewing 9 and 11 December, Leeds 4–6 January, Warwick 15–18 December).

### Weeks 1–2 — Foundations and the audit

- **Run the coverage audit** the day the export arrives (`audit/classify_bank.py`). Review the worksheet, regenerate the matrices, confirm or refute H1–H10.
- Load the ontology, taxonomies, school map and schema. Migrate surviving bank items into the schema — the three fields to fill are `applicant_role`, `provenance.source_basis` and `governance`.
- **Rewrite the scoring prompts flagged for buzzword risk.** This is week 1 work because it changes what everything downstream rewards.
- Re-verify the school map entries flagged in Output 2 for autumn refresh: Edge Hill (format TBC), KMMS, City St George's, Birmingham, Keele, Sunderland, QMUL, Cardiff, Exeter, Newcastle.
- **Deliverable:** audit report, migrated bank, corrected school data.

### Weeks 2–4 — Roleplay engine

- Build the persona runtime: state, trajectory, gated disclosure, escalation and de-escalation triggers, interruption timing, ending classification.
- **Build the three evals before the personas**: disclosure-leak rate, trigger fidelity, in-character robustness. Target leak rate under 2%.
- Author roleplays 1–12 from `roleplays.json`, which are already fully specified.
- Clinical review of RP-011 (safeguarding), RP-020 (carer strain) and anything with `SAFEG` above 1.
- **Deliverable:** working roleplay with 12 personas and a passing eval suite.

### Weeks 3–5 — Adaptive interviewer, rebuilt

*Runs in parallel with roleplay.*

- Replace keyword triggers with the eleven semantic triggers from Output 7.
- Implement `do_not_lead`, the three-follow-up cap, and the interruption rule (time only, or 45s sustained drift).
- Implement the **strong-answer branch** — currently absent from most products and the reason good users get no value.
- Turn-taking: 2.5s silence threshold, 4s in emotional roleplay, 300ms barge-in yield, offer-the-close after a time interruption.
- **Deliverable:** interruptions not caused by time under 5%; leading-content leak under 1%; challenge symmetry 0.9–1.1.

### Weeks 4–7 — Scoring and feedback

- Implement S1–S3, S5, S6, S9 with the five-point scale and the per-station floor rule.
- Implement `counts_only_if_applied`. **Validation test: take twenty top-band transcripts, strip every framework name, and confirm the score does not move.**
- Implement the six-element feedback contract with rejection of any item missing an element, and the KNOWLEDGE / REASONING / COMMUNICATION / DELIVERY classification.
- Implement `interactive_only` suppression with user-facing disclosure.
- **Deliverable:** feedback that survives being read by a medical educator without embarrassment.

### Weeks 5–9 — MVP content build

- **First 50 stations** in the order in `data/first-50-stations.csv`, then the remaining ~70 to MVP.
- Twelve current-affairs topics with `current_state` populated and dated.
- **Hard dependency: re-verify CA-009 assisted dying within 48 hours of the 11 September Second Reading**, which falls in week 3. Diarise it now.
- Clinical review of all D5 and safeguarding stations.
- **Deliverable:** 120 stations, 12 roleplays, 12 CA topics, all schema-valid.

### Weeks 8–10 — University modes and mocks

- Three archetype modes with correct timing parameters — the timings are already in the school map.
- Three full mock circuits with the six-output aggregation.
- The application-questioning join: `requires_application_questioning` stations must not reach Imperial, Sheffield, Newcastle, BSMS, Plymouth, Bristol, Glasgow, Nottingham or UEA users.
- **Deliverable:** a user selecting Leeds gets 8 stations × 6 minutes × 2 minutes reading, in-person framing, no application questions.

### Weeks 10–12 — Hardening and launch

- Full eval suite green. Currency sweep across every FAST topic. Expiry enforcement tested at query time, not in a nightly job.
- **Pilot with 15–20 real applicants**, ideally through a widening-participation channel — In2MedSchool or Medic Mentor reach exactly the applicants who cannot afford a £450 circuit day, and their feedback is the only calibration that matters.
- Measure: dispute rate on feedback, roleplay leak rate, completion rate, and whether users can name what they learned.
- **Deliverable:** launch, mid-November, in season.

### Weeks 13+ — Phase 2, running against live traffic

Asynchronous mode · numeracy and data stations · Keele pre-read · eight named university modes · current-affairs register to 22 topics · the first quarterly refresh · retire stations with low `discrimination_index`.

---

## The five most important product decisions

1. **Build the roleplay engine as the product, not as a feature.** Thirteen course-routes confirm actors on their own pages, including QUB at four of nine assessed stations and St Andrews at one of four. Exactly one UK provider advertises human actors and will not publish a price. This is the only thing on the roadmap that a question bank cannot become and a competitor cannot ship in a sprint.

2. **Make the scoring refuse to reward vocabulary.** Set `counts_only_if_applied` on the four principles, the Mental Capacity Act, NHS values, the duty of candour, the inverse care law and "correlation does not imply causation". The canonical *defence* of principlism had to rebut the charge that it is "a useful checklist approach to bioethics for those new to the field" — a rubric that scores the list is scoring the thing its own defenders apologise for. Validate by stripping framework names from top-band transcripts and confirming the score does not move.

3. **Treat university specificity as configuration, not content.** Fifty-two of 68 routes run one engine; they differ by station count, station length, prep time and delivery. Build the parameterisation and the four genuine exceptions — Oxbridge academic, group tasks, institution-specific motivation (Sheffield, ScotGEM, Pears Cumbria), and Keele's pre-read. Do not build forty content libraries.

4. **Give current-affairs content a hard expiry that withholds rather than flags.** Between February 2025 and August 2026 the government changed, a dispute started and ended, an Act rewrote career progression, and an assisted dying bill died and was reintroduced. Stale content does not become less useful — it becomes confidently wrong, and an AI that gives feedback from it will tell an applicant their correct answer is incorrect.

5. **Do not make outcome claims, and build the honest subset of what can be measured.** There is no verified evidence that interview coaching produces offers; every provider percentage in this market is an uncontrolled survey of already-shortlisted candidates. The UCAT Consortium, MSC and DSC jointly state they "do not endorse any paid-for preparation resources". Kent and Medway warns that coaching may be "positively disadvantageous". Compete on practice volume, specificity and provenance — all true — and never on outcomes.

## The five biggest content gaps

1. **Roleplay: predicted 0% of the bank, against 25% of the ontology's format demand.** Fifty-three of 158 topics are best assessed by live roleplay.
2. **Current affairs: the tester named AI, strikes and health inequalities, and the register shows 13 fast-moving topics with none of them currently held with dates.** Anything written before July 2026 has the wrong Health Secretary in it.
3. **Escalation depth.** "I'd tell someone senior" is accepted as complete across the market. The two questions that discriminate — *who specifically* and *what if nothing happens* — are almost never asked. One topic (D4.4.4) and two follow-up prompts fix this.
4. **The non-clinical settings where an applicant actually is.** School, care home, volunteering, sport, part-time work. The ontology deliberately prefers these over hospital settings, and they are the stations that cannot be answered by reciting GMC guidance.
5. **The formats nobody serves: asynchronous recorded (Brunel's entire interview), group tasks (Southampton's whole cohort, HYMS, Dundee, Edinburgh, KMMS), and prepared pre-read material (Keele).** Sixteen course-routes are not station circuits at all.

## The five highest-risk areas for inaccurate AI feedback

1. **Ethics and law.** Six specific errors are in wide circulation and any of them in our content would actively coach applicants toward answers an informed interviewer marks down: the retired GMP 2013 domains; Fraser taught as a competence test; the doctor "must report" to the DVLA; the pre-2020 consent model; the archived social-media real-name duty; HIV listed as notifiable. Mitigation: primary sources quoted in the ontology, and clinical review of every D5 station.

2. **Scoring a defensible ethical conclusion as wrong.** Mitigation: S3 scores reasoning only; `model_answer_principles` never `model_answer`; the explicit rule that no feedback may say "the correct answer was X" for an ethical scenario.

3. **Stale current affairs producing confident corrections.** Mitigation: hard expiry that withholds; every figure carries its date and source in the sentence; monthly review of assisted dying and industrial action.

4. **Penalising a seventeen-year-old for not knowing statute.** Mitigation: `premed_appropriate: reward_only` on the seven conditional topics — the scorer may add marks, never subtract.

5. **Assessing what cannot be measured.** Warmth, eye contact, body language. Mitigation: `interactive_only` suppression with disclosure; no video scoring; the honest subset only. A single credible debunking in a forum thread does disproportionate damage in a word-of-mouth market.

**The one control that catches all five in production:** `analytics.user_dispute_rate`. Where users challenge feedback, the rubric is probably wrong. Review any station above 3%.

## The first 50 stations

Full detail in `data/first-50-stations.csv`, with topic, format, context, actor, difficulty band and a one-line justification for each.

| Group | Count | Ranks | Rationale |
|---|---:|---|---|
| **A — Roleplay core** | 12 | 1–12 | The differentiator. Ranked so ranks 1–3 alone demonstrate the engine: competence boundary, anger with hidden information, confidentiality with a promise trap |
| **B — Ethics and professionalism** | 12 | 13–24 | The largest ontology domain (30 topics) and the highest wrong-feedback risk. Includes four stations that exist primarily to correct a widely-taught error |
| **C — Motivation and reflection** | 8 | 25–32 | Universal demand. Deliberately includes a followership prompt and an evidence-probe station to correct the market's leadership and trait-claim bias |
| **D — Current affairs** | 8 | 33–40 | Exactly what the tester asked for, plus screening and digital exclusion. Two carry near-term hard expiries |
| **E — Communication tasks** | 5 | 41–45 | Explanation, instruction, non-clinical bad news, apology. Low build cost, high discrimination |
| **F — Judgement and data** | 5 | 46–50 | Prioritisation where the criterion not the order is scored, plus the numeracy and data stations that serve Birmingham, Leicester, Imperial and KMMS |

Ranks 1–12 and 13–16 are the demo. If you can only build sixteen stations, build those.

## The exact next deliverable I recommend you commission

**A two-week roleplay engine spike, delivering three personas end to end with the eval suite, plus the coverage audit run against the real export.**

Precisely:

| | |
|---|---|
| **Scope** | RP-009 (competence boundary), RP-001 (anger + hidden information + clinical bait), RP-010 (confidentiality + the promise trap). Full persona runtime: state, trajectory, gated disclosure, escalation and de-escalation triggers, timed interruption, ending classification. |
| **Plus** | `audit/classify_bank.py` run against the exported bank, worksheet reviewed, H1–H10 confirmed or refuted. |
| **Evals, written first** | Disclosure-leak rate under 2% across 50 sessions per station · trigger fidelity (each escalation and de-escalation trigger measurably moves the state) · in-character robustness under attempts to break frame · ending classification accuracy against 20 human-labelled transcripts. |
| **Acceptance** | A medical educator runs all three stations twice — once performing well, once performing badly — and confirms the actor behaved differently in the two runs in the ways the persona specifies. |
| **Why this and not something else** | It de-risks the single most expensive assumption in the plan, on the smallest possible surface. If disclosure gating cannot be made reliable, the roleplay differentiator is weaker than this analysis assumes, and you find that out in two weeks rather than after building twenty-eight personas. If it works, you have a demo that no competitor can currently match, and the remaining nine MVP personas are content work against a proven runtime. |
| **What it is not** | Not the scoring engine, not the university modes, not the content build. Those are all downstream of knowing whether the actor holds its state. |

Run the audit in the same two weeks because it is cheap, it is blocking for the content plan, and the four hypotheses that would change the roadmap — H1 roleplay at zero, H3 current affairs stale, H6 clinical overreach, H7 buzzword scoring — are all answered by a single command.
