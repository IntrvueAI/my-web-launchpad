# Output 3 — Master content ontology

**Machine-readable:** `data/ontology.json` (full specification, 158 topics) · `data/ontology-flat.csv` (content-team working view) · `data/taxonomies.json` (dimensions 2–6).

**Shape: 10 domains → 45 subdomains → 158 topics.** Every topic carries the eight required fields: what the applicant must understand, how it could be assessed, permitted station formats, common weak responses, dangerous misconceptions, temporality, clinical-knowledge level, and pre-medical appropriateness.

## Why this is six orthogonal dimensions, not one list

The brief's core requirement — do not collapse everything into "communication, ethics and motivation" — is met structurally rather than by naming more categories. A station is a **point in six-dimensional space**, and each dimension varies independently:

```
STATION = domain(D5.4.4 DVLA confidentiality)
        × format(ES ethical scenario)
        × context(GP practice)
        × actor(INT interviewer, not in role)
        × difficulty{ETHUNC:3, CONFL:3, HOSTILE:2, AMBIG:2, …}
        × scoring{S1, S2, S3, S6, S9}
```

Change one coordinate and you have a genuinely different station, not a reworded one:

| Same topic (D5.4.4), different coordinates | Result |
|---|---|
| format `ES` → `RP`, actor `INT` → `PT_ANG` | The candidate now argues with the driver instead of reasoning about them. Empathy becomes scoreable; ethical vocabulary becomes less useful. |
| context `GP` → `FAM` (a relative who shouldn't be driving) | Personal stake enters. `CONFL` rises. The professional escalation ladder no longer applies and the candidate must reason from principle. |
| `HOSTILE` 0 → 3 | Tests whether the position survives challenge — a different competence from arriving at it. |
| `HIDDEN` 0 → 2 (the driver's job depends on the licence, undisclosed) | The station is now unsolvable without eliciting information. |

**Product consequence: the atomic unit in the database is the coordinate set, not the question text.** One well-specified topic generates 10–30 genuinely distinct stations. This is why the roadmap's station counts are achievable and why "how many questions do you have" is the wrong metric to compete on.

---

## Domain map

```
D1  Motivation, insight and reflection                        [4 subdomains, 18 topics]
    D1.1 Motivation for medicine
         · Origin and evolution of interest
         · Medicine versus adjacent professions
         · Course and school fit
         · Realism about cost, length and commitment
    D1.2 Insight into medical training
         · Structure of UK medical training
         · Competition and the training bottleneck            [FAST]
         · Non-clinical realities of training
         · Attrition and why doctors leave
    D1.3 Insight into medical practice
         · The doctor within a multidisciplinary team
         · Limits of medicine
         · Emotional cost and its management
         · The gap between depiction and reality
    D1.4 Reflection on experience
         · Caring or service experience · Clinical observation · Non-healthcare work
         · Failure · Family caring · Learning from feedback

D2  Communication                                             [6 subdomains, 16 topics]
    D2.1 Listening and responding      · Active listening · Cues · Silence and pacing
    D2.2 Explaining                    · Non-medical process · Health concept within lay limits · Jargon
    D2.3 Instruction and precision     · No shared visual reference · Sequencing
    D2.4 Difficult conversations       · Unwelcome news · Anger · Distress · Grief · Apologising
    D2.5 Structure and rapport         · Opening and role · Signposting · Closing and checking
    D2.6 Asynchronous and digital      · Recorded with no interlocutor · Professionalism online

D3  Empathy and person-centredness                            [2 subdomains, 7 topics]
    D3.1 Recognising and responding to emotion
         · Naming the emotion · Validating without false reassurance · Empathy under time pressure
    D3.2 Perspective and difference
         · Perspective-taking under disagreement · Cultural humility
         · The impact of illness on a life · Boundaries of empathy

D4  Professionalism and integrity                             [5 subdomains, 14 topics]
    D4.1 Honesty and probity           · Own error · Academic integrity · Honesty in the application
    D4.2 Candour                       · The four obligations · Professional vs statutory
    D4.3 Boundaries                    · Gifts and personal contact · Dual relationships
    D4.4 Concerns about others         · Raising without proof · Peer · Senior · The escalation ladder
    D4.5 Working within competence     · Recognising the limit · Saying "I don't know" · Seeking help

D5  Ethical and legal reasoning                               [9 subdomains, 30 topics]
    D5.1 Autonomy and consent          · Consent as dialogue · Refusal · Consent outside clinical settings
    D5.2 Capacity                      · Five principles · Two-stage test · Decision-specific · Best interests vs overall benefit
    D5.3 Children and young people     · Gillick · Fraser · Adolescent confidentiality · Parental disagreement
    D5.4 Confidentiality               · The default and why · Protecting another person · Required by law
                                        · DVLA · Family requests · Everyday and digital · A friend's disclosure
    D5.5 Safeguarding                  · Recognising · Escalating from a non-clinical role
                                        · What a volunteer must not do · Adults at risk
    D5.6 Beginning and end of life     · End-of-life decisions · DNACPR · Assisted dying [FAST] · Conscientious objection
    D5.7 Justice and resource allocation · Opportunity cost · QALYs and NICE · Desert-based arguments
                                        · Individual versus population
    D5.8 Frameworks and their limits   · Four principles and their tensions · Scope and cultural criticisms
                                        · Consequences versus duties · Why no scenario has one right answer
    D5.9 Conflicts of interest         · Recognising and declaring

D6  Teamwork, leadership and conflict                         [3 subdomains, 11 topics]
    D6.1 Contribution and followership · Contributing without dominating · Good followership
    D6.2 Leadership                    · Leadership behaviours · Delegation and handover
    D6.3 Conflict                      · Peer · Challenging upwards · Underperforming teammate
                                        · Discriminatory remarks · Respect across professional roles [FAST]

D7  Resilience, self-management and wellbeing                 [2 subdomains, 7 topics]
    D7.1 Pressure and coping           · Sources of pressure · Healthy strategies · Help-seeking · Boundaries
    D7.2 Self-awareness                · Strengths with evidence · Weaknesses without evasion · Calibration

D8  Judgement under pressure                                  [3 subdomains, 9 topics]
    D8.1 Prioritisation                · Ordering · Deciding what to drop · Revising when facts change
    D8.2 Uncertainty                   · Incomplete information · Resisting a misleading frame
    D8.3 Risk and safety               · Speaking up · Near misses [FAST] · Systems vs blame · Helping in an emergency

D9  Health systems, policy and society                        [6 subdomains, 25 topics]
    D9.1 NHS structure and principles  · Constitution values · Funding · Care settings
                                        · Four nations · Current structural reform [FAST]
    D9.2 System pressures              · Waiting lists [FAST] · Industrial action [FAST]
                                        · Workforce [FAST] · Emergency care [FAST]
    D9.3 Health inequalities           · Social determinants · The HLE gap [FAST]
                                        · Inverse care law · Inequity in uptake [FAST]
    D9.4 Public health and prevention  · Prevention vs treatment · Regulation vs responsibility
                                        · Obesity and GLP-1s [FAST] · Screening [FAST] · Vaccination [FAST] · AMR
    D9.5 Social care and private sector · Social care interface [FAST] · Private provision · Mental health [FAST]
    D9.6 Global and planetary health   · Sustainability as a duty · Ethics of international recruitment [FAST]

D10 Science, evidence, numeracy and technology                [5 subdomains, 21 topics]
    D10.1 Scientific reasoning [Oxbridge] · School science on novel problems · Hypothesis generation · Thinking aloud
    D10.2 Evidence and appraisal       · Correlation and causation · Sample and bias
                                        · Absolute vs relative risk · Reading a media claim
    D10.3 Numeracy                     · Percentages and proportions · Units and estimation
    D10.4 Data interpretation          · Reading accurately · Stating what data cannot show
    D10.5 Technology                   · AI: what it does [FAST] · AI accountability [FAST] · AI bias and deskilling
                                        · Health data and trust [FAST] · Digital exclusion · Genomics
```

## Distribution and what it tells you

| Cut | Result | Implication |
|---|---|---|
| **Temporality** | 83 evergreen · 55 slow · **20 fast** | Only 13% of the ontology needs quarterly maintenance. The maintenance burden is real but bounded — and it is concentrated almost entirely in D9 and D10.5, which is exactly what the tester asked for. |
| **Clinical knowledge** | 66 none · 11 lay · 81 context · **0 clinical** | Zero topics require clinical knowledge, by design. Any station that ends up needing it is miscalibrated. |
| **Pre-medical appropriateness** | 151 yes · 7 conditional · **0 no** | The seven conditionals (MCA two-stage test, Fraser, professional-vs-statutory candour, best interests vs overall benefit, scope criticisms of principlism) are **reward-if-offered, never-require, never-penalise-absence**. This flag exists to stop the scoring engine marking a 17-year-old down for not knowing statute. |
| **Format demand** | FU 59 · ES 55 · **RP 53** · PD 40 · DQ 21 | Roleplay is the second most-demanded format across the ontology and is the format the product does not have. Direct questions — the bulk of every commercial bank — are appropriate for only 21 of 158 topics. |

That last row is the ontology's main finding. **Fifty-three topics are best assessed by live roleplay and fifty-nine by adaptive follow-up. Twenty-one are genuinely direct questions.** A bank composed mainly of direct questions is mis-shaped against its own subject matter, and no amount of additional direct questions fixes it.

## Design rules encoded in the ontology

**1. Every topic states its dangerous misconceptions, and roughly a third of those are warnings about our own scoring, not the applicant's answer.** Examples now embedded in the data: never require a candidate to disclose a family member's condition (D1.4.5); never penalise a genuine "I don't know" followed by a method (D4.5.2); never suggest coping strategies involving physical discomfort (D7.1.2); never ask a candidate to disclose their own health (D7.1.3); never score a prioritisation station on the order chosen (D8.1.1); never say "the correct answer was X" for an ethical scenario (D5.8.4).

**2. Anti-buzzword rules live in the ontology, not only in the rubric.** Seven topics carry an explicit `ANTI-BUZZWORD` marker: naming the four principles (D5.8.1), naming the Mental Capacity Act (D5.2.1), naming an NHS value (D9.1.1), naming the duty of candour (D4.2.1), naming the inverse care law (D9.3.3), saying "correlation does not imply causation" (D10.2.1), and saying "there are two sides to this" (D2.5.2). In each case naming scores zero and applying scores. This is deliberate duplication — the rule must be visible to the content writer at authoring time, not only to the scorer at runtime.

**3. Where a primary source exists, the topic quotes it.** D5.4.4 carries the actual DVLA sequence; D4.4.1 carries GMC "reasonable belief… even if you are mistaken"; D5.2.1 carries the statutory wording of the MCA five principles; D5.3.1 carries Lord Scarman's test; D1.4.1 carries MSC's "What you did is only half the story". This is what allows feedback to be specific rather than plausible, and it is what a competitor cannot copy quickly.

**4. Topics that correct a live error are marked as such.** Twelve topics exist primarily to correct something the applicant has probably been taught wrongly — Gillick versus Fraser, the DVLA duty, GMP 2024 versus 2013 domains, the archived social-media guidance, the pre-2020 consent model, HIV not being notifiable, the April 2025 notifiable-disease additions including chickenpox, the UCAS similarity threshold myth. **Correcting a confidently-held wrong belief is a better product experience than teaching a new right one**, and it is measurable.

**5. Scenario context is chosen to keep the applicant in role.** The ontology systematically prefers `SCHOOL`, `VOL`, `CARE`, `WORK`, `SPORT` and `COMM` over `HOSP` and `GP`. A confidentiality station set in a school between friends is more realistic for a 17-year-old, more discriminating, and impossible to answer by reciting GMC guidance — which is exactly why it works better. The `HOSP` and `GP` contexts carry an explicit warning in `taxonomies.json`.

## A worked topic, in full

This is the level of specification every one of the 158 topics carries.

```json
{
  "id": "D4.4.1",
  "label": "Raising a concern without proof",
  "must_understand": "GMC 'Raising and acting on concerns', para 10: you are justified in
    raising a concern honestly, on the basis of reasonable belief and through appropriate
    channels, EVEN IF YOU ARE MISTAKEN. You do not need proof.",
  "assessment": "Ethical scenario where the candidate is uncertain.",
  "formats": ["ES", "RP", "FU"],
  "weak": ["'I'd wait until I was sure'", "Gathering evidence themselves"],
  "danger": ["This single principle unlocks the largest family of MMI stations. Applicants
    systematically under-report because they feel uncertain. Make it a first-class teaching point."],
  "temporality": "SLOW",
  "knowledge": "CONTEXT",
  "premed": true
}
```

From that one topic, the coordinate system generates: a peer-cheating scenario in a school (`ES`/`SCHOOL`/`AMBIG:2`), a roleplay with a colleague who may be drinking (`RP`/`WORK`/`PEER_APP`/`HIDDEN:2`), a care-home station where a resident's bruising has an innocent explanation offered confidently by a senior (`RP`/`CARE`/`SENIOR`/`SAFEG:3`/`CHALL:3`/`MISLEAD:2`), and a follow-up chain that tests whether the answer survives "but you might ruin their career if you're wrong". Four stations, four difficulty bands, one topic, one primary source.

## What is deliberately absent

- **No "hot topics" domain.** Current affairs is distributed through D9 and D10.5 as *reasoning about a topic*, never as recall. A separate hot-topics bucket invites exactly the general-knowledge quiz the content standards forbid.
- **No clinical medicine.** Zero topics at `CLINICAL` level. The only legitimate appearance of clinical content is as bait in an `OVERC`-high roleplay, where declining is the scored behaviour.
- **No "personality" domain.** Nothing is scored as a trait. Empathy, resilience and integrity appear only as observed behaviours inside specific stations.
- **No school-specific domain.** School specificity is a *filter* over the ontology (`university_compatibility` in the schema), plus three genuine content exceptions — Sheffield, ScotGEM and Pears Cumbria all score institution- or region-specific motivation, and those are handled as topics under D1.1.3.
