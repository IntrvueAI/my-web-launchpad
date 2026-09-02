# Intrvue.ai — Medicine vertical content architecture

**Compiled 29 August 2026. Target cycle: UCAS applications closing 15 October 2026 for 2027 entry; interviews November 2026 – March 2027.**

Everything here is built to be loaded, queried and extended by engineering, not read once. JSON is the source of truth; CSVs are flattened views for content and ops; markdown is the reasoning behind the data.

---

## Start here

| If you are… | Read |
|---|---|
| Deciding what to build | `docs/01-product-diagnosis.md`, then `docs/10-roadmap-and-decisions.md` |
| Building the database | `data/station.schema.json`, `data/stations-seed.json`, `docs/06-station-schema.md` |
| Building the interviewer | `docs/07-adaptive-interviewer-logic.md`, `data/roleplays.json`, `docs/04-roleplay-system.md` |
| Building the scorer | `data/scoring-rubrics.json`, `docs/08-scoring-and-feedback.md` |
| Writing content | `data/ontology-flat.csv`, `data/first-50-stations.csv`, `data/current-affairs-register.json` |
| Auditing what exists | `audit/classify_bank.py`, `docs/09-coverage-audit.md` |
| Checking a factual claim | `docs/research-appendix.md`, `data/uk-medical-school-interview-map.json` |

---

## Files

### `data/` — machine-readable

| File | What it is |
|---|---|
| `uk-medical-school-interview-map.json` / `.csv` | **68 course-routes across 50 institutions.** Format, station count, timings, delivery, roleplay, numeracy, application questioning, published criteria, changes, confidence, source URL, date checked, and the engine each route runs on. |
| `ontology.json` / `ontology-flat.csv` | **158 topics across 10 domains and 45 subdomains.** Each with what the applicant must understand, how it is assessed, permitted formats, weak responses, dangerous misconceptions, temporality, clinical-knowledge level and pre-medical appropriateness. |
| `taxonomies.json` | Controlled vocabularies for the other five dimensions: 16 station formats, 14 scenario contexts, 19 actor types, 13 difficulty variables, 9 scoring dimensions, plus the clinical-knowledge boundary rules. |
| `roleplays.json` | **20 fully specified roleplay concepts.** 40 hidden facts with disclosure conditions, 80 endings, escalation and de-escalation triggers, resistance patterns, red flags, and how the actor reacts to strong and weak responses. |
| `current-affairs-register.json` | **22 topics in three tiers** with a reusable template. Tier 3 entries carry hard expiry dates. |
| `station.schema.json` | JSON Schema draft 2020-12 for a station. Validated. |
| `stations-seed.json` | Three worked stations exercising different parts of the schema. All validate; weights sum to 1.0. |
| `scoring-rubrics.json` | Nine dimensions with five-point band descriptors, sixteen format-specific rubrics, mock aggregation spec, and the six-element feedback contract with its banned outputs. |
| `first-50-stations.csv` | The build order, grouped and justified. |

### `docs/` — the reasoning

`01` product diagnosis · `02` school map and format clusters · `03` content ontology · `04` roleplay system · `05` current-affairs system · `06` station schema · `07` adaptive interviewer logic · `08` scoring and feedback · `09` coverage audit · `10` roadmap and closing decisions · `research-appendix` primary-source evidence base.

### `audit/`

`classify_bank.py` — run against the exported question bank. Produces sixteen files: classification worksheet, seven coverage matrices, missing-topic and overrepresentation reports, four risk-flag reports, and a duplicate report. Tested.

---

## Conventions

**Confidence and provenance.** Every school record carries `source_url`, `date_checked`, `cycle_published` and `confidence` (HIGH institution states it explicitly / MEDIUM implies it or states it for an earlier cycle / LOW third-party only / UNCERTAIN conflicting or absent). **`"not published"` means the school has not stated it — never that the feature is absent.** Do not let a content writer fill a `not published` field from a competitor's page.

**Only 25 of 68 routes had 2027-entry interview detail published as at 29 August 2026.** The rest describe 2026 entry or earlier. Thirteen schools are listed in `docs/02` as requiring re-verification before launch.

**Temporality drives everything.** EVERGREEN (24-month review) · SLOW (12 months) · FAST (monthly or quarterly, **hard expiry, withheld past expiry rather than flagged**). 83 / 55 / 20 topics respectively.

**Clinical boundary.** Zero of 158 topics require clinical knowledge, by design. A station at `CLINICAL` level is invalid. Where clinical content appears it is bait, and declining is the scored behaviour.

**Anti-buzzword.** Naming a framework, principle, value or law scores zero. Enforced by `counts_only_if_applied` in the schema and by the rubrics, not only by policy.

---

## Known gaps and open items

- **The existing question bank, prompts, scoring logic and screenshots were not attached to this session.** Output 1's product diagnosis is built from the tester feedback, the research and the competitive landscape; Output 9 is the audit instrument rather than the audit. Both are marked where they depend on the export.
- `docs/09` lists ten pre-registered hypotheses. Four of them — roleplay at zero, current affairs stale, clinical overreach present, buzzword scoring present — would change the roadmap.
- **CA-009 assisted dying expires 12 September 2026**, the day after the reintroduced bill's Second Reading. Diarise the re-verification.
- **CA-010 industrial action expires 30 November 2026.** Consultants hold a live mandate from 6 July 2026 with no dates announced.
- No school except Edinburgh has updated its published wording to reflect UCAS replacing the free-text personal statement with three structured questions from 2026 entry. Treat any per-school claim about the structured questions as unverified.
- Ulster's structural detail is from a 2021-entry page — five cycles old, and labelled LOW throughout.
