# Output 6 — Question and station database schema

**Machine-readable:** `data/station.schema.json` (JSON Schema draft 2020-12, validated) · `data/stations-seed.json` (three worked examples, all validate, weights sum to 1.0).

The brief's field list is implemented, with additions. What follows is the readable table, then the reasoning behind the changes.

## Schema, as a table

| Field | Type | Req | Purpose and notes |
|---|---|:--:|---|
| **Identity** ||||
| `station_id` | `ST-nnnnn` | ✔ | Immutable, never reused after retirement |
| `version` | semver | ✔ | Minor = wording. **Major = anything changing what is assessed, which breaks historical score comparability** |
| `title` | string | ✔ | Internal. Never shown before the station runs — a title leaks the answer |
| `status` | enum | ✔ | draft → in_review → **clinically_reviewed** → live → flagged → expired → retired |
| `supersedes` | id | | Lineage |
| **Domain** ||||
| `domain.primary_topic` | `Dn.n.n` | ✔ | **Exactly one** ontology leaf. Forces authoring focus |
| `domain.secondary_topics` | array ≤4 | | |
| `domain.assessment_domains` | array 1–3 | ✔ | More than three means the station is unfocused |
| **Format** ||||
| `format.primary` | enum(16) | ✔ | DQ PE WE AC ES RP IT EX PR CA DI AD PD SP GT AR |
| `format.secondary` | array | | Includes FU |
| `format.engines` | array | | Derived; stored for query speed |
| **Scenario** ||||
| `scenario.context` | enum(14) | ✔ | SCHOOL VOL CARE WORK HOSP GP COMM FAM UNI RES PH SPORT ONLINE NONE |
| `scenario.applicant_role` | string | ✔ | **Must state what the candidate does NOT have access to or authority over.** Primary defence against clinician-positioning |
| `scenario.opening_prompt` | string | ✔ | Exact words at t=0 |
| `scenario.candidate_brief` | string | | Shown during prep. Absent for zero-prep schools |
| `scenario.stimulus` | object | | Chart/table/passage/image; `supplied_in_advance` true for Keele-style pre-reads |
| `scenario.actor.type` | enum(19) | | Required for RP/IT/EX/GT |
| `scenario.actor.roleplay_ref` | `RP-nnn` | | **Pointer to a shared persona, not an inline copy** |
| **Delivery** ||||
| `delivery.preparation_time_seconds` | 0–300 | | 0 Aberdeen/Manchester · 60 UCL · 120 Leeds, Brunel · 300 HYMS |
| `delivery.response_time_seconds` | 60–1800 | ✔ | 240 City St George's · 300 UCL · 600 Leicester, Warwick · 1500 Swansea |
| `delivery.mode` | enum | | live_voice · asynchronous_recorded · text |
| `delivery.interruption_permitted` | bool | | |
| `delivery.notes_permitted` | bool | | Default **false** — Bristol, Sheffield, QMUL Malta ban notes; Bristol also bans AI tools |
| `delivery.adjustments_available` | array | | Accessibility. Leeds explicitly permits rephrasing on request |
| **Assessment** ||||
| `assessment.scoring_dimensions[]` | array ≥2 | ✔ | `{dimension, weight, interactive_only}`; **weights must sum to 1.0**; S1 and S2 mandatory on every station |
| `assessment.expected_content[]` | array ≥1 | ✔ | `{point, necessity, evidence_cues, counts_only_if_applied}` |
| ↳ `necessity` | enum | | required (absence caps the band) · expected (costs marks) · optional_strong (lifts only) |
| ↳ `counts_only_if_applied` | bool | | **The anti-buzzword flag.** True ⇒ naming scores zero |
| `assessment.optional_strong_points` | array | | Never penalised by absence |
| `assessment.red_flags[]` | array | ✔ | `{flag, severity: note/concern/serious, detection_cues}` — reported separately, never averaged away |
| `assessment.model_answer_principles` | array | | **Deliberately not `model_answer`** |
| `assessment.band_descriptors` | object | | Station-level overrides of the dimension rubrics |
| **Adaptive** ||||
| `adaptive.planned_followups[]` | array | | `{prompt, purpose, max_uses}` |
| `adaptive.conditional_followups[]` | array | | `{trigger{type, detail, min_confidence}, prompt, purpose, priority}` — 11 trigger types |
| `adaptive.max_followups` | int | | Default 3. Hard cap |
| `adaptive.interrupt_policy` | enum | | never · **on_time_only** (default) · on_time_or_serious_drift |
| `adaptive.do_not_lead` | array | | **Content the follow-up may never supply.** If the station tests whether they reach safeguarding, the probe may not say "safeguarding" |
| **Hidden information** ||||
| `hidden_information[]` | array | | `{fact, disclosure_condition, condition_type, essential_to_pass}` |
| **Difficulty** ||||
| `difficulty.variables` | 13 × 0–3 | ✔ | AMBIG EMO CONFL HIDDEN SAFEG TIME MISLEAD HOSTILE INCOMP ETHUNC OVERC CHALL LIMITS |
| `difficulty.band` | enum | ✔ | **Derived from the vector, not hand-set.** `4_adversarial` must be labelled in the UI |
| **University compatibility** ||||
| `university_compatibility.mode` | enum | ✔ | universal (default, should be the majority) · include · exclude |
| `university_compatibility.school_ids` | array | | Refs into the school map |
| `university_compatibility.requires_application_questioning` | bool | | **True for AC stations. Must never be served to Imperial, Sheffield, Newcastle, BSMS, Plymouth, Bristol, Glasgow, Nottingham or UEA** |
| **Provenance** ||||
| `provenance.source_basis[]` | array ≥1 | ✔ | `{type, reference, date_checked, quote}` — **surfaced to the user** |
| `provenance.confidence` | enum | | HIGH/MEDIUM/LOW that this reflects a real UK interview demand |
| **Governance** ||||
| `governance.clinical_knowledge_boundary` | enum | ✔ | NONE LAY CONTEXT **CLINICAL (invalid for a live station)** |
| `governance.clinical_bait` | bool | | Scenario invites clinical advice; declining is the top-band behaviour |
| `governance.premed_appropriate` | enum | ✔ | yes · **reward_only** · no |
| `governance.temporality` | enum | ✔ | EVERGREEN SLOW FAST |
| `governance.current_affairs_ref` | `CA-nnn` | | |
| `governance.current_affairs_expiry` | date | | **Past this date the station is withheld, not flagged** |
| `governance.review_date` | date | ✔ | |
| `governance.clinical_review` | object | | Required for safeguarding, capacity, confidentiality, end of life, clinical bait |
| `governance.sensitivity_flags` | array | | bereavement · safeguarding · discrimination · family_illness · financial_hardship · carer_strain |
| `governance.wellbeing_rules` | array | | Station-level guards |
| **Analytics** (system-written) ||||
| `analytics.discrimination_index` | number | | Correlation with overall performance. **Low ⇒ retire the station** |
| `analytics.hidden_fact_leak_rate` | number | | Roleplay only. Target < 0.02 |
| `analytics.user_dispute_rate` | number | | **Best early-warning signal for a wrong rubric** |

## What changed from the brief's list, and why

**Split into eight groups.** The brief's flat list mixes identity, content, delivery, scoring, governance and analytics. Grouping matters because the groups have different owners and different change cadences: content writers touch `domain`/`scenario`/`assessment`, ops touch `governance`, the system writes `analytics`.

**`expected_content` became structured objects.** A flat string array cannot express that some points are required and others merely lift a strong answer — and without that distinction the scorer cannot tell "capped at borderline" from "lost a mark". `necessity` does that in one field.

**`counts_only_if_applied` is new and is the most important addition.** It is the mechanism that makes the brief's own content standard — *do not reward mentioning NHS values or GMC principles without applying them* — enforceable rather than aspirational. Set it true and the scorer must find application to *this* scenario before awarding anything. Set it on: the four principles, the Mental Capacity Act, NHS Constitution values, duty of candour, the inverse care law, "correlation does not imply causation".

**`model_answer_principles`, not `model_answer`.** The brief asked for model answer principles; the schema enforces the distinction by name so nobody ships a `model_answer` field by accident. City St George's publishes: *"Often there is no right or wrong answer — the interviewers are assessing your ability to express your thinking."*

**`red_flags` gained severity and became a separate report.** Plymouth is the evidence: it scores a binary red-flag section alongside its numeric scale. A serious red flag in a station with an otherwise strong total is exactly the case that must not be averaged away.

**`do_not_lead` is new.** Without it, a follow-up designed to help will hand the candidate the answer the station exists to test. This is the schema-level defence against the brief's concern about "leading the applicant toward the answer".

**`difficulty.band` is derived, not authored.** Hand-set difficulty drifts — every author thinks their station is hard. Deriving it from the thirteen-variable vector makes difficulty comparable across authors and lets the adaptive engine step users up by moving one variable rather than swapping content.

**`scenario.actor.roleplay_ref` points at a shared persona.** Twenty personas serve hundreds of stations. Inlining them would mean fixing a leaky disclosure condition in a hundred places.

**`provenance.source_basis` is surfaced to the user, not hidden.** In a market where incumbents sell "delivered by doctors", showing *"built from Queen's University Belfast's own candidate information page, checked 29 August 2026"* is the credibility substitute available to a software product. It is also self-enforcing: a writer who has to name a source writes fewer invented stations.

**`interactive_only` on scoring dimensions.** Some behaviours — eliciting hidden information, using silence, recovering from interruption, revising when given a reason — cannot be assessed from a transcript. Marking them means asynchronous and text modes suppress them **and tell the user why**, rather than scoring them silently and wrongly.

**`sensitivity_flags` and `wellbeing_rules` are new.** The content includes bereavement, safeguarding, discrimination and carer strain. A candidate should not be ambushed by a grief station, and no station should ever prompt for the candidate's own health or a family member's condition. The schema makes that a field rather than a policy nobody reads.

**`analytics.user_dispute_rate` is new and is the most operationally useful field in the schema.** Where users challenge feedback, the rubric is probably wrong. That is the cheapest available detector for the failure mode this whole product should fear most.

**`current_affairs_expiry` withholds rather than flags.** A flag protects content ops; withholding protects the user.

## Worked examples

`data/stations-seed.json` contains three stations that exercise different parts of the schema and all validate:

- **ST-00001 — DVLA confidentiality** (`ES`, stretch): the full published GMC sequence as `expected_content` with graded necessity; four red flags including the widely-taught error that the doctor has a legal duty to report; `do_not_lead` blocks the follow-up from supplying "risk of death or serious harm"; `clinical_bait` true because offering a view on whether the condition affects driving is a flag.
- **ST-00002 — the relative who has been waiting** (`RP`, stretch): points at persona RP-001; two gated hidden facts with different condition types; S5 marked `interactive_only`; `university_compatibility` scoped to the eleven routes that publish roleplay.
- **ST-00003 — should doctors strike** (`PD`, standard): symmetric `conditional_followups` that push against whichever side the candidate takes; `current_affairs_ref: CA-010` with a **hard expiry of 30 November 2026**; `wellbeing_rules` require the interviewer never to signal a position.

## Two integrity rules the database should enforce, not merely document

1. **A station whose `governance.current_affairs_expiry` has passed cannot be served.** Enforce at query time, not in a nightly job.
2. **A station with `requires_application_questioning: true` cannot be served to a school whose map entry has `application_questioning: false`.** This is a join, and it is the difference between a product that knows Imperial does not discuss your personal statement and one that wastes an applicant's practice time.
