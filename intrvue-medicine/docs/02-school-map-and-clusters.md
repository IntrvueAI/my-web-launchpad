# Output 2 — UK medical school interview map and format clusters

**Compiled 29 August 2026. 68 course-routes across 50 institutions.**

Machine-readable: `data/uk-medical-school-interview-map.json` (primary) and `data/uk-medical-school-interview-map.csv` (flattened view).

## How to read the data

Every record carries `source_url`, `date_checked`, `cycle_published` and `confidence`. **`cycle_published` is the most important field for content operations.** Only 25 of 68 routes had 2027-entry interview detail published as at 29 August 2026. The rest describe 2026 entry or earlier, and several schools state explicitly that the format may change.

`"not published"` means the school has not stated it. It does not mean the feature is absent. Schools publish far less than coaching sites imply they do — which is precisely why coaching sites invent it. **Do not let a content writer fill a `not published` field from a competitor's page.**

Confidence: `HIGH` the institution states it explicitly · `MEDIUM` the institution implies it or states it for an earlier cycle · `LOW` third-party only · `UNCERTAIN` sources conflict or the field is absent everywhere.

## What is actually published, in aggregate

| Field | Confirmed | Explicitly excluded | Not published |
|---|---:|---:|---:|
| Station count | 43 | — | 25 |
| Station length | 30 | — | 38 |
| Roleplay / actors | 12 | 0 | 56 |
| Group task | 7 | — | 61 |
| Numeracy / data task | 4 (+1 dated) | 3 | 60 |
| Application-based questioning | 13 | 17 | 38 |
| Scientific reasoning | 6 | 6 | 56 |
| Explicit change-from-last-cycle statement | 6 | — | 62 |

Two things follow. First, **the application-questioning split is real and actionable**: 13 routes confirm they question on the application, 17 confirm they do not. Imperial says the UCAS application is "unlikely to be referred to"; QMUL says the panel "may ask you questions from the information you have provided". Same city, opposite preparation. This is the single highest-value per-school flag in the product.

Second, **roleplay's 12 confirmations are a floor, not a ceiling.** Fifty-six routes are silent. Among schools that publish station-level detail at all, roleplay confirmation is close to the majority.

---

## Format clusters

Nine engines. Fifty-two of 68 routes run E1.

| Engine | What it is | Routes | Representative schools |
|---|---|---:|---|
| **E1** | Timed short-station MMI circuit | 52 | UCL, Leeds, QUB, Aberdeen, UEA, Bristol, Manchester |
| **E2** | Live roleplay station (actor persona) | 13 | QUB, St Andrews, Nottingham, Birmingham, Manchester, ARU, Swansea |
| **E3** | Panel / conversational interview | 12 | Glasgow, QMUL, Keele, Newcastle A101, KCL A102, Southampton |
| **E4** | Academic-tutorial (scientific reasoning led) | 4 | Oxford ×2, Cambridge ×2 |
| **E5** | Asynchronous recorded circuit | 3 | Brunel, Imperial A102, Pears Cumbria |
| **E6** | Numeracy / data-interpretation station | 5 | Birmingham, Leicester, KMMS, Imperial, Edge Hill |
| **E7** | Group task | 7 | Southampton ×3, HYMS, Dundee, Edinburgh, KMMS |
| **E8** | Pre-read prepared material | 1 | Keele |
| **E9** | Written knowledge assessment at interview | 2 | Bangor A101, Buckingham |

### Cluster 1 — Fast circuit, no thinking time (build first)

**Aberdeen (5×5, no reading), Bristol (6×5, ~30 min total), Manchester (5×8, no reading or writing), BSMS (5×10, no prep), City St George's (6×~4), St Andrews (4×6), KCL (~7, one question each), Plymouth (5 stations, ~55 min)**

Defining demand: answer cold, structure on the fly, finish inside the timer. Manchester and Aberdeen state there is no reading component at all. Bristol's 30-minute total is the tightest circuit in the country.

Product implication: **the timer and the cold start are the simulation.** A practice mode that shows the question on screen for ten seconds before the clock starts is not simulating these schools.

### Cluster 2 — Circuit with reading time (build first, same engine, different config)

**UCL (8×5 + 1 min), Leeds (8×6 + 2 min), UEA (6×5 + 1.5), ARU (6×7 + 1), QUB (5 min + 1), Birmingham (8 min incl. 2), Leicester (7×10 + 1), Brunel (5 min + 2), HYMS (5 min thinking time per question)**

Defining demand: use the reading minute well. UCL is the extreme — 2–3 questions inside a 5-minute station off one minute of reading. HYMS is the opposite extreme — 5 minutes of thinking before each question.

Product implication: **preparation time must be a first-class simulated phase with its own coaching**, not dead air before the question. What a candidate does in Leeds's two minutes is a trainable skill and nobody teaches it.

### Cluster 3 — Roleplay-intensive (the differentiating build)

**QUB home (4 of 9 assessed stations), QUB international (2 of 7), St Andrews (≥1 of 4), Nottingham A100/A101 (≥1 of 6), Birmingham (named role-player station), Manchester (simulated patients as interviewers), ARU, KMMS, City St George's, Swansea (20–30 min stations including role play)**

Note QUB Station 1: **an actor playing a fellow student**, not a patient. That is the single most reusable roleplay template in UK admissions — peer-to-peer, no clinical knowledge required, and exactly what a pre-medical applicant can legitimately handle.

### Cluster 4 — Panel and conversational (16 routes are not circuits)

**Glasgow** (30 min, two panels, choose one of two ethical scenarios, interviewers blinded to everything but your name) · **QMUL** (two senior staff plus sometimes a lay selector; panel has your UCAS application) · **Keele** (two separate 15-minute interviews about two hours apart, with GMC guidance and a case study sent 1–2 days ahead) · **Newcastle A101** (panel of two, same domains as the MMI) · **KCL A102** (remote panel of two, standardised scoring sheets) · **Sheffield international** (online panel) · **Southampton ×3** (selection day: interview plus group task, in person only, no online alternative)

Defining demand: sustained conversation, memory across the session, no station reset. A candidate who has only practised 5-minute resets will run out of material in a 15-minute Keele interview.

### Cluster 5 — Academic-tutorial (Oxbridge only, genuinely separate content)

**Oxford A100** (two colleges, each with ≥2 academics and ≥1 practising clinician; online December 2026; interviewers blinded to UCAT) · **Oxford A101** (typically four interviews) · **Cambridge A100** (≥2 interviews, 35–60 min, at least one current practitioner; college-dependent delivery) · **Cambridge A101**

Cambridge publishes the most concrete expectation in UK admissions: sixth-form Chemistry, Biology, Maths and Physics applied to novel scenarios, with "lateral thinking and conceptual flexibility". Oxford's published criteria are, however, half personal characteristics — empathy, motivation, communication, honesty, ethical awareness, ability to work with others. **The assumption that Oxbridge is purely academic is wrong and is worth correcting in product copy.**

For 2027 entry Cambridge uses only the overall cognitive UCAT score and **has dropped the SJT**.

### Cluster 6 — Asynchronous recorded (a distinct skill, and an exact-simulation opportunity)

**Brunel** is the outlier of the entire dataset: six stations, 2 minutes reading plus 5 minutes recording each, completed alone in any order across a **five-day window** on the Shortlister platform, blueprinted to Good Medical Practice, with Brunel stating it will not ask academic questions. **Imperial A102** and **Pears Cumbria A102** run blended circuits with asynchronous components.

Product implication: this is the one format where a software product is not approximating the real thing — it *is* the real thing. Build a recording mode with the timer, no interlocutor and no follow-up. It is cheap, and it is a complete answer for Brunel applicants.

### Cluster 7 — Group task (high value, high complexity, defer to Phase 3)

**Southampton ×3** (formal group task, in person only, offers made on selection-day performance) · **HYMS** (group exercise of up to 10 candidates, 22 of 90 points, scored by a PBL tutor plus an observing medical student) · **Dundee** (~30 min observed discussion with five other applicants) · **Edinburgh** (35-minute group task within the Assessment Day) · **KMMS** (40-minute group station, individually assessed)

Seven routes, but they include Southampton's entire cohort and a large share of Scotland. Simulating this needs multiple believable co-participants with distinct behaviours — a dominator, a silent one, someone with a wrong idea held confidently. It is the hardest thing in this document to build well and the easiest to build badly.

### Cluster 8 — Numeracy and data

**Leicester** is the only school publishing numeracy as a **threshold hurdle** — a pass mark, mental arithmetic, no calculator, no medical knowledge required. **Birmingham** runs a computer-based Calculation Station plus a separate Data Interpretation and Debate station. **Imperial** names Data Interpretation among its topics. **KMMS** has a data handling station. **Edge Hill** lists "Interpretation of data" — from a 2020 policy.

Counterweight: **QUB states explicitly there are no stations requiring interpretation of data or graphs. Manchester has no reading or writing at any station.** Do not present numeracy as a universal MMI feature.

### Cluster 9 — Out of scope, and say so

**Bangor A101** requires a 90-minute single-best-answer biomedical science examination across 48 topic areas alongside the MMI. **Buckingham** runs a computer-based Multiple Mini Assessment before its online OSSE. Neither is an interview-practice problem. Exclude them explicitly rather than half-serving them.

---

## Recommended practice modes, and what each actually requires

| Mode | Engines | Routes covered | New content needed | Build phase |
|---|---|---:|---|---|
| **Standard MMI circuit** (configurable n / length / prep) | E1 | 52 | None beyond the core bank | 1 |
| **Roleplay station** | E2 | 13 confirmed, likely more | Full persona system (Output 4) | 1 |
| **Panel / conversational** | E3 | 12 | Long-form question chaining, session memory | 2 |
| **Asynchronous recorded** | E5 | 3 | Recording UI + no-interlocutor mode | 2 (cheap) |
| **Numeracy / data station** | E6 | 5 | Small item bank, non-clinical arithmetic | 2 (cheap) |
| **Pre-read material station** | E8 | 1 (Keele) | Attachment + discussion-of-text prompts | 2 (very cheap, uniquely unserved) |
| **Academic tutorial** | E4 | 4 (Oxbridge) | Separate science-reasoning bank | 3 |
| **Group task** | E7 | 7 | Multi-agent participants | 3 |
| **Written assessment** | E9 | 2 | — | Never |

**The one-line version: two engines (E1 + E2) cover 52 of 68 routes and contain the entire differentiator. Three cheap additions (E5, E6, E8) cover another 9 routes for very little work. The two expensive ones (E4, E7) cover 11 routes and can wait.**

---

## Cross-cutting facts that change content design

**UCAT SJT is load-bearing at the interview stage in ways that vary wildly.** Newcastle folds the SJT band into the interview score at the weight of one full MMI station. Birmingham weights it equally with each station (Band 1 = max, Band 4 = 0). Sheffield converts it to its five-point scale as a ninth component of 45. Edinburgh gives it 7.5% of the total. Cambridge has dropped it entirely for 2027. QMUL, Brunel, Edge Hill and Lincoln reject Band 4 outright. **There is no universal rule. Do not publish one** — direct users to the MSC Entry Requirements Tool per course.

**Published scoring models worth copying** (see Output 8):
- **ARU**: three domains per station — quality of answer, demonstration of skills/qualities, communication — 5 each, 15 per station, 90 total.
- **Imperial**: 6 content + 4 communication per station.
- **Aberdeen**: every station independently scores communication and interpersonal skills *in addition to* its own domain.
- **Sheffield**: five-point descriptor scale (Excellent / Good / Satisfactory / Borderline / Unsatisfactory) with a floor of 3 in every section.
- **BSMS**: five-band descriptors then a numeric score out of 20 per station.
- **Plymouth**: numeric scale **plus a separate binary red-flag field** for unsuitable behaviour or statements.

The convergent design across six independent schools: **a domain score, a communication score attached to every station regardless of domain, and a separate binary red flag.** That is our scoring model, and it is evidenced rather than invented.

**Delivery is fragmenting by fee status.** Cardiff, Nottingham, Leicester, Birmingham, Liverpool, Leeds, Sheffield, Newcastle, St Andrews, Dundee and QUB all split in-person versus online by home/international status. Manchester and BSMS let the candidate choose. Store delivery as a per-cohort field, not a per-school one.

**Contextual and widening-participation routes rarely publish a distinct interview.** Aberdeen's Gateway2Medicine uses the same five domains as A100; Leeds' Gateway uses the same eight-station MMI; Bristol's Gateway shares the A100 interview page. Dundee's Gateway publishes nothing. **Do not build separate WP interview content** — build separate eligibility and context content instead.

## Schools whose data must be re-verified before launch

| School | Why |
|---|---|
| Edge Hill (A100, A110) | Interview format explicitly "Details TBC" for 2027 entry |
| KMMS | States it does not commit to the same number or type of stations |
| City St George's | Warns detail "may change" for the 2026 application cycle |
| Birmingham | Interview page is 2026 entry; entry requirements are 2027 |
| Keele | How-to-apply page still says September 2025 entry |
| Sunderland | Delivery mode conflicts between two of its own pages |
| QMUL | Interview type and delivery conflict between course page and admissions policy |
| Cambridge | Online vs in-person is college-dependent, no course-level answer |
| Cardiff | Personal-statement usage conflicts between course page and admissions policy |
| Exeter | Station count genuinely unresolved; only a stale 2024 figure exists |
| Ulster | All structural detail is from a 2021-entry page — five cycles old |
| Newcastle | 7×7 station figure is 2025 entry, not restated in the 2027 policy |
| Plymouth, BSMS, Bristol | Station timings anchored to 2024/2022 documents |

**No school in the entire dataset except Edinburgh has updated its wording to acknowledge that UCAS replaced the free-text personal statement with three structured questions from 2026 entry.** Every "personal statement" reference on every other page is legacy wording. Treat any claim that a named school interviews on the new structured questions as unverified — but note that Q3, *"What else have you done to prepare outside of education, and why are these experiences useful?"*, is now the explicit home of work experience, and the reflective demand is written into the question.
