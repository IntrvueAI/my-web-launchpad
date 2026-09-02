# Output 9 — Coverage audit of existing content

**Status: the question bank, prompts, scoring logic and screenshots were not attached to this session.** Rather than speculate about content I have not seen, this output is the audit *instrument* — built, tested and ready to run the moment the export arrives. Running it is a single command and produces every matrix the brief asked for.

```
cd audit
python3 classify_bank.py --input /path/to/questions.csv --outdir out
```

Input needs one column: `text` (or `question`, `prompt`, `stem`). Everything else is optional and improves the audit: `id`, `category`, `difficulty`, `university`, `format`, `scoring_prompt`, `follow_ups`, `tags`, `created`. JSON works too. **Include `scoring_prompt` if it exists** — the buzzword-risk detector reads it, and that is where the most consequential problems usually hide.

Tested on a fifteen-item fixture: it correctly caught a near-duplicate pair (0.92), two clinical-overreach items, three leading questions and one time-sensitive item.

---

## What it produces

| File | Contents |
|---|---|
| `00_summary.json` | Headline counts, topic coverage %, roleplay %, flag totals |
| `01_classification_worksheet.csv` | **Every item with a proposed ontology topic and format, a confidence score, and blank columns for human correction** |
| `02_matrix_by_domain.csv` | Count and % by the ten assessment domains |
| `03_matrix_by_topic.csv` | Count and % by the 158 ontology leaves |
| `04_matrix_by_format.csv` | Count and % by the sixteen station formats |
| `05_matrix_by_difficulty.csv` | Using the existing difficulty labels |
| `06_matrix_by_university.csv` | University relevance, including how much is untagged |
| `07_matrix_roleplay.csv` | Roleplay versus non-roleplay |
| `08_matrix_temporality.csv` | Evergreen / slow / fast, **plus a `MISLABELLED_time_sensitive` count** — items whose topic is evergreen but whose text contains a dated reference |
| `09_missing_topics.csv` | Every ontology topic with **zero** coverage, with suggested formats |
| `10_overrepresented_topics.csv` | Topics carrying more than 3× an even share |
| `11_flag_clinical_overreach.csv` | Items demanding diagnosis, treatment, prescribing, prognosis, or positioning the candidate as a doctor |
| `12_flag_leading_or_poorly_phrased.csv` | "Don't you think…", "surely…", "how would you demonstrate empathy", "what are the four pillars" |
| `13_flag_buzzword_risk.csv` | Items **and scoring prompts** that reward naming a framework or match keywords |
| `14_flag_time_sensitive.csv` | Items containing dated references — strikes, COVID, 7-day NHS, named ministers, waiting-list figures |
| `15_duplicates.csv` | Duplicate and near-duplicate pairs with similarity and Jaccard scores |

The classifier is a **first pass**. Every row where `needs_human_review = YES` (confidence below 0.6 or unclassified), plus a 10% random sample of the rest, must be reviewed before the matrices are trusted. The worksheet has `human_topic`, `human_format`, `human_verdict` and `human_notes` columns for exactly this, and re-running against the corrected worksheet regenerates the matrices.

---

## The seven questions the brief asked, and how each is answered

| Question | Answered by | What "bad" looks like |
|---|---|---|
| Classify every question against the ontology | `01` + `03` | High `UNCLASSIFIED` — items that do not map to any recognised assessment domain are usually general knowledge in disguise |
| Duplicates and near-duplicates | `15` | Any pair above 0.93; near-duplicates above 0.82 that differ only in wording |
| Overrepresented topics | `10` | Anything above 3× even share. Expect motivation and teamwork |
| Missing topics | `09` | The count matters less than *which* — a gap in D5.5 safeguarding is worse than a gap in D10.1 |
| Stations that look realistic but are not representative | `11` + manual review of `01` against the school map | The tell is a hospital setting with the candidate holding clinical authority |
| Questions requiring excessive clinical knowledge | `11` | Any hit is a design error, not a difficulty setting |
| Poorly phrased or leading questions | `12` | "How would you demonstrate empathy" names the attribute, so the candidate need only echo it |
| Feedback criteria rewarding buzzwords | `13` | Scoring prompts containing "should mention", "keyword", or a framework name |

---

## What to look for that the script cannot see

Four checks need a person, and they are where the most valuable findings will be.

**1. Does the scoring prompt reward the answer or the phrasing?** Read ten scoring prompts. For each, ask: *if a candidate expressed this idea in completely different words, would the prompt still score it?* If the prompt says "should mention confidentiality", the answer is no. Rewrite as considerations with `evidence_cues`, and set `counts_only_if_applied` on every framework reference.

**2. Does the follow-up logic fire on missing keywords?** This is the tester's complaint — *"if it interrupts you, though not always"* — and it is diagnosable by reading the trigger conditions. If a trigger is "candidate did not say X", it is a keyword matcher. Output 7 gives the eleven trigger types that should replace it.

**3. Is the candidate positioned as a clinician anywhere?** Read every station's setup line. The schema requires `applicant_role` to state what the candidate does *not* have access to or authority over. Any station missing that framing is a candidate for rewrite even if the script did not flag it.

**4. Do the university tags survive contact with the school map?** Cross-check `06_matrix_by_university.csv` against `data/uk-medical-school-interview-map.json`. Known errors to look for specifically: Surrey listed as offering A100 (it does not); Worcester or Chester listed as undergraduate (both are graduate-entry only); Glasgow or Dundee described as MMI schools (neither is); Edinburgh described as not interviewing (it does, and the Assessment Day is worth 50%); Leeds A101 described as graduate entry (it is a Gateway Year that refuses graduates); Cardiff graduate entry as A104 (it is A101).

---

## Hypotheses this audit should test

Stated in advance so the audit confirms or refutes them rather than rationalising whatever it finds. These come from the tester's feedback and from what the market's banks typically contain — **they are predictions, not findings.**

| # | Hypothesis | Refuted if |
|---|---|---|
| H1 | Roleplay is **0%** of the bank | Any `RP`-classified items exist |
| H2 | D1 (motivation and reflection) and D6 (teamwork) together exceed 40% of items | They are under 40% |
| H3 | D9 (health systems and policy) is under 5%, and what exists is stale | D9 is well covered with dated, current content |
| H4 | Format distribution is over 70% `DQ` and `PE` | Formats are spread across 8+ types |
| H5 | Near-duplicate rate is above 10% | Under 5% |
| H6 | Some items require clinical knowledge an applicant cannot have | Zero hits in `11` |
| H7 | Scoring prompts reward naming frameworks | Zero hits in `13` |
| H8 | University tagging is absent or wrong | Tags are present and reconcile with the school map |
| H9 | Difficulty is set by hand and does not correlate with anything measurable | Difficulty correlates with observed score distributions |
| H10 | Time-sensitive items carry no expiry and some are already wrong | Items carry review dates and are current |

H1, H3, H6 and H7 are the four that would change the roadmap. H1 and H3 are close to confirmed already by the tester's own feedback — they told you roleplay and current affairs were missing.

---

## Matrix templates

Each matrix is emitted with these columns. Populate from the run; the baseline column is what a healthy library looks like at the "strong launch" stage of the roadmap.

**By domain**

| Domain | Count | % | Healthy target % |
|---|---:|---:|---:|
| D1 Motivation, insight and reflection | | | 15 |
| D2 Communication | | | 15 |
| D3 Empathy and person-centredness | | | 10 |
| D4 Professionalism and integrity | | | 12 |
| D5 Ethical and legal reasoning | | | 20 |
| D6 Teamwork, leadership and conflict | | | 8 |
| D7 Resilience and self-management | | | 5 |
| D8 Judgement under pressure | | | 5 |
| D9 Health systems and society | | | 8 |
| D10 Science, evidence, numeracy, technology | | | 2 |
| UNCLASSIFIED | | | **0** |

**By format** — targets reflect the ontology's own demand: 53 topics are best assessed by roleplay, 21 by direct question.

| Format | Count | % | Healthy target % |
|---|---:|---:|---:|
| RP roleplay | | | 25 |
| ES ethical scenario | | | 20 |
| DQ direct question | | | 12 |
| PE personal example | | | 10 |
| PD policy discussion | | | 10 |
| WE work-experience reflection | | | 6 |
| EX / IT explanation and instruction | | | 6 |
| PR prioritisation | | | 4 |
| DI / CA data and calculation | | | 4 |
| AD article discussion | | | 2 |
| AC application challenge | | | 1 |
| SP / GT / AR | | | remainder |

**By difficulty** — target roughly 20 / 50 / 28 / 2 across foundation, standard, stretch and adversarial. A bank clustered in one band cannot support adaptive progression.

**By university relevance** — expect `universal` to be the large majority. A high proportion of school-specific tags is a maintenance liability, not a feature: 52 of 68 course-routes run the same engine and differ only in configuration.

**Roleplay versus non-roleplay** — target 25% roleplay. Predicted current state: 0%.

**Evergreen versus time-sensitive** — target roughly 55 / 32 / 13 evergreen / slow / fast, mirroring the ontology. **Watch `MISLABELLED_time_sensitive`**: an item classified against an evergreen topic whose text mentions strikes or COVID is a stale item hiding in a stable bucket, and it is the single most likely source of wrong feedback.

---

## What to do with the output

1. Run the script, review the worksheet, regenerate.
2. **Retire** everything in `15_duplicates.csv` above 0.93, keeping the better-written of each pair.
3. **Rewrite** everything in `11` (clinical overreach) and `12` (leading). These are not fixable by tagging.
4. **Rewrite the scoring prompts** flagged in `13` as `expected_content` items with `counts_only_if_applied` where appropriate. This is the highest-value remediation in the whole audit, because it changes what the product rewards rather than what it asks.
5. **Date-stamp or retire** everything in `14`, and attach a `current_affairs_ref` where the topic exists in the register.
6. **Migrate** the survivors into the schema, filling `applicant_role`, `provenance.source_basis` and `governance` — the three fields the existing bank almost certainly lacks.
7. Treat `09_missing_topics.csv` as the production backlog, prioritised by Output 10 rather than by topic order.

Expect the honest outcome to be that **a substantial minority of the existing bank migrates unchanged, a large fraction needs its scoring rewritten rather than its question, and the gaps are concentrated exactly where the tester said they were.** That is a good result — it means the question-writing is sound and the assessment layer is where the work is.
