# Output 5 — Medical current-affairs system

**Machine-readable:** `data/current-affairs-register.json` — 22 topics, tiered, with hard expiry dates.

The tester asked for "AI in healthcare, strikes, health inequalities and general medical knowledge". Three of those four are here. The fourth — general medical knowledge — is deliberately absent, and that decision is defended below.

---

## The finding that should govern this whole subsystem

**Between February 2025 and August 2026 the UK government changed, the Health Secretary changed twice, a doctors' dispute started and ended, a new Act rewrote medical career progression, waiting-list performance crossed a target for the first time in a decade, and an assisted dying bill died and was reintroduced.**

Verified independently against gov.uk during this research: **Andy Burnham became Prime Minister on 20 July 2026** and **Yvette Cooper was appointed Secretary of State for Health and Social Care on the same day.** Any content that says "Wes Streeting says…" is now wrong, and so is any content that describes resident doctors as currently striking, cites pre-2026 specialty competition ratios, or refers to the Leadbeater assisted dying bill as live.

This is the argument for the architecture below. Current-affairs content does not gradually become less useful — **it becomes confidently wrong**, and an AI that gives feedback based on it will tell an applicant their correct answer is incorrect. That is a worse product failure than having no current-affairs content at all, which is roughly the position the product is in today.

For comparison: a competitor's "hot topics" list in 2026 still leads with the 7-day NHS and coronavirus. The bar is low. The opportunity is that freshness is cheap for us and structurally hard for a content library that was written once.

---

## Three tiers

| Tier | What it is | Review | Expiry | Count | Behaviour past expiry |
|---|---|---|---|---:|---|
| **1 — Evergreen** | NHS founding principles, what a doctor's job involves, health inequality as a concept, screening principles | 24 months | None | 4 | n/a |
| **2 — Slow policy** | AMR, prevention versus regulation, physician associates, resource allocation and NICE, private provision | 12 months | Soft (2027) | 5 | Flagged for review, still served |
| **3 — Fast-moving** | Assisted dying, industrial action, AI, waiting lists, workforce, structural reform, inequality statistics, obesity cohorts, vaccination, health data, social care, mental health, patient safety | Monthly or quarterly | **Hard date** | 13 | **Withheld from users** |

**The hard-expiry rule is the design decision that matters.** Past its expiry date, a Tier 3 topic is not served — the station is removed from circulation and the user sees "we're updating this topic" rather than a stale fact. A flag that only content ops can see does not protect the user; withholding does. This costs a small amount of coverage and eliminates the entire class of confidently-wrong-feedback failure.

Two entries have near-term hard expiries and should be treated as a launch dependency:

- **CA-009 Assisted dying — expires 12 September 2026.** Second Reading of the reintroduced Terminally Ill Adults (End of Life) Bill is Friday 11 September 2026. The topic must be re-verified within days of that vote or withheld. It will be a live interview question all cycle precisely because it is moving.
- **CA-010 Industrial action — expires 30 November 2026.** Consultants hold a live 12-month mandate from 6 July 2026 with no dates announced. Dates could be announced at any point during the interview season.

---

## The topic template

Every topic has fourteen fields. The design principle is that **only one field changes on a routine refresh**.

| Field | Changes on refresh? | Purpose |
|---|---|---|
| `baseline_knowledge` | No | What an applicant is expected to be able to say. Three to five bullets. If it needs more, split the topic. |
| `not_required` | No | **What they explicitly do not need to know.** Prevents scope creep and stops the scorer penalising absent detail. |
| `stakeholders` | No | Who has an interest and what they want |
| `central_tensions` | No | The unresolved conflicts. A topic with no tension is a fact, not an interview topic. |
| `ethical_principles` | No | Which principles are actually in play — never all four by default |
| `likely_questions` | No | Phrased as an interviewer would ask |
| `weak_answer_patterns` | No | Specific failure modes, used to generate feedback |
| `balanced_answer_components` | No | What a strong answer contains — never a model answer |
| `source_types` | No | The classes of source a writer should use |
| `update_frequency` | No | Cadence |
| `expiry_trigger` | No | The named event that invalidates the entry |
| `expiry_date` | Yes, on refresh | Hard date, Tier 3 only |
| `last_verified` | Yes, on refresh | ISO date |
| **`current_state`** | **Yes — this is the only substantive field that changes** | Dated facts, each with its date and source |

A refresh is therefore: check the sources, rewrite `current_state`, update two dates. **Roughly twenty minutes per topic, thirteen topics, once a quarter.** That is a quarter of a day of work per quarter to keep the fastest-moving content in the market accurate. Adding a new topic means filling the template — no system change, no code change, no rubric change.

The `not_required` field deserves emphasis because it does something no competitor content does: it bounds the topic. CA-011 says an applicant does not need to know model architectures, vendor products or performance metrics. That protects the applicant from being told they should have known something no interviewer would ask, and protects the scorer from penalising its absence.

---

## What the register contains

**Tier 1 (4):** NHS structure and funding · What a doctor's job involves · Health inequalities as a concept · Screening principles and harms

**Tier 2 (5):** Antimicrobial resistance · Prevention versus regulation · Physician associates and workforce shape · Resource allocation, NICE and QALYs · Private sector involvement

**Tier 3 (13):** Assisted dying · Doctors' industrial action · AI in healthcare · Waiting lists and elective recovery · Workforce and the training bottleneck · NHS structural reform · Health inequality statistics · Obesity and weight-loss medication · Vaccination and measles · Health data and digital exclusion · Social care · Mental health provision · Patient safety and the maternity investigations

The brief's list is fully covered, with additions the brief did not name but that the research made unavoidable: the **Medical Training (Prioritisation) Act 2026** (the largest change to UK medical careers in two years, and something an applicant will be asked about because it directly affects them), **the maternity investigations** (arguably the defining UK health story of 2026, with two landmark reports in one week in June), and **physician associates post-Leng**, where the position has moved materially and where an applicant is likely to be asked what a PA actually is.

Two brief-listed topics were deliberately merged rather than kept separate: genomics folds into screening and into D10.5.6 in the ontology, because at applicant level the interesting content is the consent and equity consequences rather than the technology; and digital exclusion is inseparable from health data, so CA-018 covers both and the connection between them is itself the high-scoring insight.

---

## Why "general medical knowledge" is not being built

The tester asked for it and then, in the same paragraph, ranked roleplay above it. They were right, and the schools agree:

- **Leeds:** "The interview at Leeds does not aim to test clinical or scientific knowledge."
- **Aston:** medical knowledge is explicitly excluded from the MMI.
- **Plymouth:** interviews explore "attitudes, outlook and way of thinking" rather than medical or scientific knowledge.
- **Brunel:** "we shall not be asking academic questions."
- **QUB:** the four assessed competencies are explicitly non-cognitive.

What *is* assessed is different and more specific. **Manchester scores "contemporary medical knowledge" as a named criterion. HYMS scores "current medical awareness". Imperial tells candidates questions "could reflect a current news story". Leeds tells them to "keep up-to-date with developments in health and social care that are making headlines". Glasgow advises awareness of "current issues/challenges within the NHS". Sheffield has a whole section called "Medicine in a wider context" and tells candidates to follow "medical breakthroughs, topical controversies, ethical debates and NHS politics". Edge Hill lists "Awareness of current health challenges" as a competency.**

That is not general knowledge. It is **the ability to hold a contested question, name the tension, and argue both sides.** So the register is built for reasoning, not recall: every topic's `central_tensions` field is mandatory, and no topic is served as a quiz.

**Product rule: no current-affairs station may be scored on factual recall.** A candidate who gets a figure slightly wrong but names the tension correctly outscores one who cites the figure perfectly and argues one side.

---

## Political neutrality is an engineering requirement, not a nicety

Three topics in the register are politically contested in ways that make our interviewer's behaviour a live risk: **industrial action, private sector involvement, and international recruitment.**

The interviewer will be talking to applicants whose interviewers may be BMA members, consultants holding a live strike mandate, doctors who worked through the strikes, or international medical graduates. And it may be talking to applicants who are themselves international, or whose parents are IMGs.

The rules, implemented in the interviewer prompt and enforced by eval:

1. **Never signal a position.** Not through phrasing, not through which side gets the harder follow-up.
2. **Probe both directions symmetrically.** If a candidate argues for strike action, push on patient harm. If they argue against, push on pay erosion and workforce sustainability. Measure this: the ratio of challenge-to-position should be near 1:1 across a large sample.
3. **Never mark down a defensible position.** Score the reasoning, the acknowledgement of the opposing case, and the accuracy of the facts — never the conclusion.
4. **Refusing to engage is a weak answer, and should be fed back as such.** "I'd rather not comment because it's political" fails a question about whether doctors should strike. That is a legitimate finding, not a political judgement.

CA-013 carries an explicit handling note for this reason. So does D9.6.2 in the ontology.

---

## The maintenance process

**Quarterly, thirteen Tier 3 topics, one owner.** For each: open the sources in `source_types`, check whether the `expiry_trigger` event has occurred, rewrite `current_state` with dated facts, update `last_verified` and `expiry_date`, and log the diff.

**Event-driven, on top of the cadence.** Named triggers that should cause an immediate refresh regardless of the calendar: a parliamentary vote on assisted dying; consultant strike dates; publication of the 10 Year Workforce Plan; the Casey Commission Phase 1 report; passage of the NHS Modernisation Bill; a new ONS healthy life expectancy release; any UKHSA quarterly vaccine coverage release.

**The pages worth watching**, from the research: NHS England RTT statistics (monthly, the single most-cited number in interviews); the BMA's NHS backlog data analysis (best aggregated dated performance page); gov.uk DHSC news; bills.parliament.uk for the assisted dying bill; the King's Fund NHS Modernisation Bill tracker; the BMA media centre; UKHSA vaccine coverage statistics; the Casey Commission; Health Foundation press releases.

**A rule for the content team: every number carries its date and source in the same sentence.** Not in a footnote, not in a metadata field the writer forgets — in the text, because that is what makes a stale figure visible.

**Version the register, not just the topics.** When `current_state` changes materially, the stations that reference the topic should be re-reviewed, because a station written against "resident doctors are striking" does not become correct when the register is updated around it. This is the coupling that will bite in six months if it is not built now: `station.source_date` and `current_affairs_expiry` in the schema (Output 6) exist for exactly this.
