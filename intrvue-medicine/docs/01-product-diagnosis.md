# Output 1 — Executive product diagnosis

**Date: 29 August 2026. Target: 2027 entry (applications close 15 October 2026, 18:00 UK).**

**Scope limit, stated up front:** the question bank, prompts, scoring logic and screenshots were not attached to this session. Everything below is derived from the tester's feedback, the primary-source research in this pack, and the competitive landscape. Claims that depend on seeing your content are marked **[needs attachments]** and are answered in Output 9's method rather than asserted here.

---

## The five findings that should change what you build this quarter

### 1. Your tester did not ask for more questions. They asked for a different product mode.

Read the feedback again with attention to what is being praised and what is being requested:

| What they praised | What that is |
|---|---|
| "questions are all relevant and typical" | Content validity — you have it |
| "picks up on the things you miss out" | Omission detection — you have it |
| "a manuscript of what you answered" | Transcript — you have it |
| "if it interrupts you… it will let you carry on" | Turn-taking — partially working |
| "getting used to speaking aloud" | Exposure therapy — the actual job being done |

| What they requested | What that is |
|---|---|
| AI in healthcare, strikes, health inequalities, general medical knowledge | **Content gap** — cheap, fast, and a maintenance liability |
| **"Roleplay stations, where the AI acts as a patient… probably more so than the general-knowledge questions"** | **Missing product mode** — expensive, slow, and the only defensible thing on the list |

The tester ranked these for you, unprompted, and ranked them correctly. Roleplay is a capability; current affairs is a content refresh. Treating them as two items on the same backlog is the first mistake to avoid.

### 2. Roleplay is not a nice-to-have in the UK market. It is a scored component at a large minority of schools, and nobody sells practice for it at scale.

From the primary-source research:

- **12 of 68 course-routes confirm roleplay or actor stations on the institution's own pages.** True prevalence is higher: 41 routes publish nothing either way, and the schools that *do* publish detail disproportionately confirm it.
- **Queen's Belfast runs four role-player stations out of nine assessed stations — 44% of the interview.** Station 1 is an actor playing a fellow student.
- **St Andrews guarantees at least one actor station out of four** — 25%+ of the assessment.
- **Nottingham (A100 and A101) guarantees at least one role play** in every six-scenario circuit.
- Birmingham runs a named "Interaction in Healthcare Setting" role-player station; Manchester uses simulated patients as interviewers; Swansea's 20–30 minute stations explicitly include role play; KMMS has a dedicated roleplay station; City St George's names role play as a station type; ARU confirms actors.

Now the supply side. Across ~15 UK providers researched, **exactly one — The Medic Life — advertises practice with human actors, and does not publish a price.** Everyone else's "roleplay" is a tutor, a doctor, a medical student, or another candidate reading a card. Medic Mind has an AI category labelled "Communication & Roleplay" that is record-a-monologue-and-score — there is no counterparty.

Effective cost of one roleplay repetition in today's market: **£7–£20** inside a circuit day, **£35–£195** as a standalone mock, with fixed Sunday dates in London, Birmingham or Manchester and 7–10 places per session — against interview invitations that arrive with days to weeks of notice between November and March.

This is the whole commercial case for the Medicine vertical, and it is a narrow one. A conversational model playing an anxious relative who withholds information until asked the right question is a thing a text question bank structurally cannot be, and a thing a human actor cannot be at 11pm the night before for £15.

### 3. "University-specific practice" is mostly a parameter set, not a content library — and the four exceptions are worth building.

The instinct is to build 40 university modes. The data says don't.

Sixty-eight course-routes reduce to **nine underlying engines**, and 52 of them run on one engine (a timed short-station circuit). What varies between Leeds and UEA is not the content — it is `stations: 8 vs 6`, `station_length: 6 vs 5`, `prep_time: 2 vs 1.5`, `delivery: in-person vs in-person`. That is configuration.

What genuinely cannot be shared:

| Genuine exception | Schools | Why content must be bespoke |
|---|---|---|
| Academic-tutorial questioning | Oxford, Cambridge (4 routes) | Sixth-form Chemistry/Biology/Maths/Physics applied to novel problems. A different subject entirely. |
| Group tasks | Southampton (×3), HYMS, Dundee, Edinburgh, KMMS | Needs multiple simulated participants. Genuinely hard. |
| Institution-specific motivation | Sheffield ("Knowledge of Sheffield" is a *scored section*), ScotGEM, Pears Cumbria (Cumbria health outcomes) | The right answer is about that school and that region. |
| Pre-read prepared material | Keele | Candidates receive GMC guidance plus a case study 1–2 days before. Trivially cheap to build; nobody offers it. |

Everything else is one engine with a config row. **Build the parameterisation, not forty content libraries.** Then sell the four exceptions as the reason to choose you, because they are the four places where a generic MMI question bank visibly fails.

### 4. Three widely-repeated "facts" about UK medicine interviews are wrong, and if your content repeats them, that is your single largest credibility risk.

These came out of primary-source checking. Each is currently asserted by mainstream admissions content:

| Common claim | Reality (institution's own page, checked 29 Aug 2026) |
|---|---|
| "Edinburgh doesn't interview home applicants" | Edinburgh runs an Assessment half-day with a series of short interviews plus a group task, worth **50% of the total score**. Scottish/RUK/RoI candidates must attend in person. |
| "Glasgow runs MMIs" | Glasgow runs **a single 30-minute online interview in two panels** for 2027 entry. Panel B hands you two ethical scenarios of two or three sentences and asks you to pick one. |
| "Dundee runs MMIs" | Dundee runs **a ~30-minute observed group discussion with five other applicants**, then a structured one-to-one. 1h40m total. |

Add to these: **Surrey has no A100** (graduate entry only). **Worcester and Chester have no A100.** **Leeds A101 is a Gateway Year and explicitly refuses graduate applicants.** **Cardiff's graduate entry is A101, not A104.** **Pears Cumbria is graduate-entry only.**

And in the ethics-and-guidance layer, which is where an AI product will confidently generate wrong feedback:

- **GMC Good Medical Practice was rewritten in January 2024.** The 2013 domains ("Knowledge, skills and performance / Safety and quality / Communication, partnership and teamwork / Maintaining trust") are retired. Most circulating material still teaches them.
- **UCAT Abstract Reasoning was removed in 2025.** Scores are 900–2700, not 1200–3600. Pre-2025 cut-offs do not map.
- **The GMC's social media guidance was archived in January 2024**, including the much-quoted duty to identify yourself by name online.
- **Fraser guidelines are not a competence test.** Gillick is the test of the child; Fraser is a decision test specific to contraception and sexual health. Teaching Fraser as the competence framework is the most common ethics error in coaching material.
- **The doctor does not have a duty to report an unfit driver to the DVLA.** The *driver* carries the legal duty. The doctor explains it, tries to persuade, assesses risk of death or serious harm, then may disclose — and must tell the patient in writing afterwards.
- **The GMC's consent guidance has been a dialogue model since 2020**, built on "what matters to this patient" and "reasonable alternatives including taking no action". "Voluntary, informed, capacity" is the pre-2020 model.

A question bank that quietly encodes any of these is not merely stale — it will actively coach applicants toward answers an informed interviewer marks down. That is a worse failure than having no content.

### 5. The commercial risk is not that you can't build it. It is that Medify already shipped an adequate version into a subscription your users already own.

**On 17 February 2026 Medify launched interview practice — speak or type, get personalised feedback — inside its existing £210/year all-access subscription.** Medify claims 250,000 students since 2009 and "2 in 3 applicants". Its interview bank is thin (150+ questions, no live mocks, no MMI circuit, no interactive roleplay), but its distribution is nearly free and yours is not.

Meanwhile **MedInterview.ai exists at roughly £9–13/month off a single page**, and **MedEntry shipped AI avatar interviewers on 3 December 2025** — though its scoring is human and takes 2–3 working days, at £195 per university mock.

The read: **the model is not the moat.** Anything you build on generic conversational capability is copied within a quarter, and one competitor already bundles it at zero marginal cost. The defensible assets are the ones that take months of unglamorous work: the mark schemes, the verified per-school blueprints, the refresh cadence, and the interactive roleplay engine that requires real design rather than a prompt.

Market sizing, for calibration: **25,770 medicine applicants for 2026 entry** (UCAS, 29 Oct 2025, up 10.4%). Modelled interviewees: roughly **13,000–18,000 distinct applicants** attend at least one interview per cycle — that figure is modelled, not published, and should be treated as an estimate. A six-to-fourteen-week purchase window, near-zero repeat, demand collapsing February to September.

---

## What is already valuable

**The interaction loop, not the question bank.** Speak aloud → transcript → follow-up challenge → omission feedback is the correct architecture for this market, and the tester confirmed each element works. Nobody should rebuild it.

**Omission detection specifically.** "The AI picks up on the things you miss out" is the single most-praised behaviour in the feedback, and it maps directly onto how UK schools actually score. Imperial marks 6 for content and 4 for communication. ARU marks quality of answer, demonstration of skills, and communication out of 5 each. Sheffield requires 3 or better in *every* section to be prioritised. Content coverage is genuinely half the marks, and you already detect it.

**The transcript.** Underrated. It is the only artefact in the market that lets an applicant see what they actually said rather than what they think they said, and it is the substrate for every piece of specific feedback you will ever give.

**Interruption with recovery.** "If it interrupts you, though not always, it will let you carry on" describes a real interviewer behaviour. The inconsistency is a bug, but the capability is right — real MMI interviewers interrupt, and no static resource simulates that.

## What is generic or easily replicated

**The question bank itself.** Free MMI question libraries are the main SEO lead-generation asset of every commercial provider — Medic Portal, BlackStone, TheUKCATPeople all publish hundreds of questions free. A question list has no defensive value and never will.

**"Hot topics" articles.** Medify publishes 70+; Medic Portal advertises a "200+ page guide packed with current affairs". Yours will be neither better nor worse. What *is* differentiating is freshness — Medic Mind's hot-topics list in 2026 still leads with the 7-day NHS and coronavirus — and freshness is a process, not content.

**Generic scored feedback.** Medic Mind's own marketing concedes its AI feedback "may be less detailed and more generic" than tutor review, and uses it as a funnel toward paid humans. If your feedback is recognisably template-driven within three attempts, you have built the same thing.

**Timed practice.** Any provider can put a countdown on a page.

## What applicants cannot practise effectively with a static question bank

This is the list that should govern the roadmap.

1. **Being reacted to.** Every roleplay station turns on whether the actor's state changes in response to what the candidate does. A card that says "the patient is angry" cannot get less angry.
2. **Information that is withheld until you ask correctly.** The most discriminating roleplay design is hidden information with disclosure conditions. Static text either gives it to you or doesn't.
3. **Being interrupted, and recovering.** Real stations run out of time mid-answer. Nobody practises this.
4. **Follow-up interrogation of a specific claim you just made.** "You said you learned resilience from your Duke of Edinburgh expedition — what specifically did you do when things went wrong?" cannot be pre-written; it depends on the answer.
5. **Speaking to a timer with no notes.** Bristol, Sheffield and QMUL Malta explicitly ban notes; Bristol explicitly bans AI tools during the interview. Aberdeen and Manchester have no reading component at all.
6. **The asynchronous recorded format.** Brunel's entire interview is six recorded stations completed alone over five days. There is no interviewer, no rapport, no follow-up. This is a distinct skill that a live mock actively fails to train.
7. **Group discussion.** Southampton, HYMS, Dundee, Edinburgh and KMMS all run one. There is currently no way to practise it alone.
8. **Reading two short scenarios and choosing one** (Glasgow Panel B) — a decision skill, under time pressure, before you have said anything.

## Where AI has a genuine advantage

**Unlimited repetition at zero marginal cost, in a market that prices repetition as scarce.** Every incumbent meters practice: credits at Medic Mind, 10-of-20 attempted stations at Medic Portal, 20-of-40 at Blue Peanut's £449.99 day, £195 per mock at MedEntry. Unlimited attempts for the price of one circuit day is a different product shape, not a better version of the same one.

**A counterparty that adapts.** The single capability no static resource and no scaled competitor has.

**Availability against a spiky calendar.** Invitations land November to March with short notice; live circuits run on fixed Sundays in three cities.

**Freshness as a demonstrable feature.** A dated, versioned current-affairs layer is trivially maintainable for you and visibly broken for them.

**Per-station diagnosis.** Sheffield's "3 or better in every section" and Plymouth's binary red-flag field are published proof that schools score per-station, not holistically. An AI can tell an applicant *which* station type they consistently fail. A human mock cannot, because it only sees one sitting.

## Where AI does not have an advantage, and where claims will hurt you

**Non-verbal and paralinguistic assessment.** Real stations score warmth, eye contact, pace and presence. Imperial gives 4 of 10 marks per station to communication — how you say it. You can assess pace, filler density, hesitation, answer structure and turn-taking from audio. You cannot credibly assess warmth or eye contact, and claiming to is the most likely source of a public debunking in a word-of-mouth market. Build the honest subset and label the boundary in the product.

**Efficacy claims.** There is no verified evidence that interview coaching produces offers. Provider figures — "94% got at least one offer", "93% acceptance", "98%" — are uncontrolled post-hoc surveys of candidates who were already shortlisted. The UCAT Consortium, Medical Schools Council and Dental Schools Council jointly state they "do not endorse any paid-for preparation resources… These are unnecessary." **Kent and Medway explicitly warns that preparation courses "might be less useful" and that school-organised coaching may be "positively disadvantageous", and requires candidates to sign an NDA.** Do not make outcome claims. Make practice-volume and specificity claims, which are true.

**Authority.** This purchase is substantially made by parents, and incumbents sell named doctors and Feefo Platinum. An AI score carries no authority by itself. The counter is transparency about provenance — every station tagged with the school page and date it was built from — not borrowed credentials.

## What would make the Medicine vertical defensible

In order of durability:

1. **A roleplay engine with real state.** Personas with emotional trajectories, hidden information gated behind disclosure conditions, escalation and de-escalation triggers, and multiple endings. This is a design asset, not a prompt, and takes months to get right.
2. **Verified per-school blueprints with visible provenance.** 68 course-routes, each with a source URL and a date-checked field, surfaced to the user. When Nottingham switches A101 from GAMSAT to UCAT and moves home applicants in-person, you show it and everyone else is a cycle behind.
3. **Mark schemes that reward reasoning and refuse to reward vocabulary.** See Output 8. The four principles of biomedical ethics scoring *zero on naming* is a design decision that separates a serious product from a buzzword detector.
4. **A dated, expiring current-affairs layer.** Not articles. Structured topics with review triggers and expiry dates, so nothing can silently rot.
5. **The four format exceptions** — Oxbridge academic, group tasks, asynchronous recorded, and Keele's pre-read — where generic banks visibly fail.

Distribution note: **In2MedSchool** (registered charity, claims 5,000 volunteer mentors and 4,000 students) and **Medic Mentor** (claims 50,000 students a year across 5,000 schools) reach exactly the applicants that £450 circuit days exclude. A free or WP tier through those channels is a distribution route the incumbents' price points structurally lock them out of — but note it cuts against the "no endorsement of paid preparation" position, so it needs to be genuinely free at the point of use, not a trial.

## What you should not build

| Don't build | Why |
|---|---|
| **A general medical-knowledge quiz** | Your tester asked for it and then immediately ranked it below roleplay. Leeds states plainly it "does not aim to test clinical or scientific knowledge". Plymouth, Brunel, Aston and Manchester say versions of the same. Aston publishes "medical knowledge" as explicitly excluded. Applicants are not doctors, and rewarding recall of facts trains the wrong behaviour. Current affairs is not general knowledge — build that instead, as *reasoning about* a topic. |
| **Forty separate university content libraries** | 52 of 68 routes run one engine. Build config rows. |
| **A Dundee Gateway mode** | Dundee publishes nothing about it beyond "an interview may be required". |
| **Anything for Bangor A101's entrance exam** | A 90-minute single-best-answer biomedical science paper across 48 topic areas. Out of scope. Say so and exclude it. |
| **Buckingham, University of Lancashire modes** | Buckingham is £41,500/year private with an in-house computer assessment. Lancashire has "a very limited number of places available for UK students". Tiny addressable populations. |
| **Video/eye-contact scoring** | Unverifiable, easily debunked, high reputational cost, low added value over audio-derived delivery metrics. |
| **A model-answer library** | Sheffield and QMUL Malta ban notes; Bristol bans AI tools in the interview; City St George's publishes "Often there is no right or wrong answer". Model answers teach the exact behaviour that fails. Publish *principles* and *evidence patterns* instead — see the schema's `model_answer_principles` field, which is deliberately not called `model_answer`. |
| **A live human tutor marketplace** | It is the incumbents' business, it does not scale, and it inverts your only cost advantage. |

---

## Flawed assumptions worth naming

**"More questions is more product."** The market's free question banks are its lead-generation layer. Volume is not the constraint; the constraint is what happens after the question.

**"MMI is the format."** 16 of 68 routes are not station circuits. Oxford, Cambridge, Glasgow, Dundee, Keele, Southampton (×3), QMUL, KCL A102, Newcastle A101, Sheffield-international and Worcester are panels, tutorials, group days or hybrids. If the product only simulates MMI, it is wrong for roughly a quarter of course-routes, including two of the largest-brand destinations in the country.

**"Ethics content means the four principles."** The canonical *defence* of the four principles had to rebut the charge that they are "a useful 'checklist' approach to bioethics for those new to the field". If your rubric awards points for naming them, you have built a vocabulary detector.

**"General knowledge is interview competence."** It isn't, and the schools say so. What is assessed is whether an applicant can hold two sides of a contested question, attribute a claim, and say what would change their mind.

**"Feedback should tell them what to say."** Leading the applicant toward the answer is a failure mode, not a feature. See Output 7 for the distinction between useful challenge and coaching the answer out of them.

---

**[needs attachments]** The following can only be answered against your actual content, and Output 9 provides the classifier and matrix to answer them the moment the files arrive: how much of the existing bank is duplicated; which domains are over-represented; whether the scoring prompts reward buzzwords; whether any existing station requires clinical knowledge an applicant cannot have; and whether the follow-up logic interrupts on keyword absence rather than on reasoning gaps.
