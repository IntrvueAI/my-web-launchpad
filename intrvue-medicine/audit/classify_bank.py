#!/usr/bin/env python3
"""
Intrvue.ai Medicine — existing content coverage audit.

Run this against the current question bank the moment it is exported. It produces
every matrix Output 9 requires, plus the duplicate report and the risk flags.

INPUT  : a CSV or JSON export of the existing bank. Only one column is mandatory
         ('text'). Everything else is optional and improves the audit if present:
         id, text, category, difficulty, university, format, scoring_prompt,
         follow_ups, tags, created
OUTPUT : audit/out/*.csv  — coverage matrices, duplicates, flags, worksheet

USAGE  : python3 classify_bank.py --input ../exports/questions.csv --outdir out

The auto-classifier is a FIRST PASS. It assigns a proposed ontology topic and
format by keyword and structure, and marks its confidence. Every row with
confidence below 0.6, and a 10% random sample of the rest, must be reviewed by
a human before the matrices are trusted. The worksheet CSV is laid out for that.
"""

import argparse, csv, json, os, re, sys
from collections import Counter, defaultdict
from difflib import SequenceMatcher

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "..", "data")


# ----------------------------------------------------------------------------- load

def load_ontology():
    o = json.load(open(os.path.join(DATA, "ontology.json")))
    leaves, domains = {}, {}
    for d in o["domains"]:
        domains[d["id"]] = d["label"]
        for s in d["subdomains"]:
            for t in s["topics"]:
                leaves[t["id"]] = {
                    "label": t["label"], "domain": d["id"], "domain_label": d["label"],
                    "subdomain": s["id"], "subdomain_label": s["label"],
                    "formats": t["formats"], "temporality": t["temporality"],
                    "knowledge": t["knowledge"], "premed": t["premed"],
                    "weak": t["weak"], "danger": t["danger"],
                }
    return leaves, domains


def load_rows(path):
    if path.lower().endswith(".json"):
        raw = json.load(open(path))
        rows = raw if isinstance(raw, list) else raw.get("questions") or raw.get("stations") or []
    else:
        with open(path, newline="", encoding="utf-8-sig") as f:
            rows = list(csv.DictReader(f))
    out = []
    for i, r in enumerate(rows):
        r = {(k or "").strip().lower(): (v if v is not None else "") for k, v in r.items()}
        text = str(r.get("text") or r.get("question") or r.get("prompt") or r.get("stem") or "").strip()
        if not text:
            continue
        r["_text"] = text
        r["_id"] = str(r.get("id") or f"Q{i+1:04d}")
        out.append(r)
    return out


# ------------------------------------------------------------------- classification
# Keyword signals per ontology leaf. Deliberately conservative: a low-confidence
# guess that a human corrects is far better than a confident wrong bucket.

TOPIC_SIGNALS = {
    "D1.1.1": ["why do you want to (study|do) medicine", "why medicine", "when did you decide"],
    "D1.1.2": ["why not nursing", "why not be a nurse", "physician associate instead", "why not dentistry", "other healthcare career"],
    "D1.1.3": ["why (this|our) (university|medical school)", "why did you choose (this|us)", "what attracts you to (this|our)"],
    "D1.1.4": ["how long", "debt", "cost of (studying|medical school)", "commitment"],
    "D1.2.1": ["foundation (year|programme)", "specialty training", "after you graduate", "medical training path"],
    "D1.2.2": ["competition ratio", "training post", "unemploy", "bottleneck", "prioritisation act"],
    "D1.2.3": ["night shift", "rota", "on call", "hardest part of (training|medical school)"],
    "D1.2.4": ["leave medicine", "quit", "attrition", "why do doctors leave"],
    "D1.3.1": ["multidisciplinary", "team around the patient", "what does a nurse do", "role of the doctor", "mdt"],
    "D1.3.2": ["can't cure", "chronic", "limits of medicine", "not everyone gets better"],
    "D1.3.3": ["emotional(ly)? (demanding|difficult)", "cope with death", "affect you emotionally", "burnout"],
    "D1.3.4": ["television", "tv", "realistic", "what do you think doctors do all day"],
    "D1.4.1": ["work experience", "volunteering", "care home", "placement", "what did you learn from"],
    "D1.4.2": ["shadow", "observed", "watched a doctor"],
    "D1.4.3": ["part[- ]time job", "retail", "customer", "saturday job"],
    "D1.4.4": ["failure", "failed", "went wrong", "didn't go to plan", "setback"],
    "D1.4.5": ["cared for a (relative|family|parent|grandparent)", "young carer"],
    "D1.4.6": ["feedback", "criticism", "told you (you were|that you)"],
    "D2.1.1": ["listen", "check(ing)? understanding", "summaris"],
    "D2.1.2": ["cue", "picked up on", "noticed they were"],
    "D2.1.3": ["silence", "pause"],
    "D2.2.1": ["explain (to|how)", "describe .* to someone who"],
    "D2.2.2": ["explain .*(clinical trial|vaccine|screening|waiting list|referral)"],
    "D2.2.3": ["jargon", "medical terms", "plain english"],
    "D2.3.1": ["give instructions", "cannot see", "back to back", "draw"],
    "D2.4.1": ["bad news", "breaking bad news", "tell (them|him|her) that"],
    "D2.4.2": ["angry", "furious", "shouting", "aggressive", "irate"],
    "D2.4.3": ["upset", "crying", "in tears", "distressed"],
    "D2.4.4": ["bereave", "grief", "died", "passed away", "loss of"],
    "D2.4.5": ["apolog", "say sorry"],
    "D2.5.1": ["introduce yourself"],
    "D2.5.2": ["structure your answer"],
    "D2.5.3": ["summarise at the end", "close the conversation"],
    "D2.6.1": ["record(ed)? (your )?answer", "to camera"],
    "D2.6.2": ["social media", "instagram", "facebook", "posted online", "twitter", "tiktok"],
    "D3.1.1": ["empath", "how would (they|he|she) feel"],
    "D3.1.2": ["reassure", "worried", "anxious"],
    "D3.2.1": ["refus(es|ing)? (treatment|help|to)", "disagree with (the|a) (doctor|advice)"],
    "D3.2.2": ["culture", "religio", "language barrier", "interpreter", "belief"],
    "D3.2.3": ["impact (of|on) .*(illness|diagnosis)", "living with a condition"],
    "D3.2.4": ["too involved", "boundaries with a patient", "over[- ]identif"],
    "D4.1.1": ["you made a mistake", "your own error", "own up"],
    "D4.1.2": ["cheat", "plagiaris", "copied", "exam misconduct"],
    "D4.1.3": ["exaggerat", "made up .*(experience|placement)", "lied on"],
    "D4.2.1": ["duty of candour", "something went wrong", "disclose the error"],
    "D4.3.1": ["gift", "present from a patient", "tip", "personal (number|contact)"],
    "D4.4.1": ["not sure|can't be certain", "no proof", "suspicion"],
    "D4.4.2": ["friend|colleague|classmate .*(cheat|drink|steal|mistake)", "fellow student"],
    "D4.4.3": ["senior|consultant|supervisor .*(wrong|mistake|unsafe|rude)"],
    "D4.4.4": ["escalat", "who would you tell", "report it to"],
    "D4.5.1": ["out of your depth", "not qualified", "beyond your", "limits of your competence", "asks you for (medical )?advice"],
    "D4.5.2": ["don'?t know the answer", "you don'?t know"],
    "D5.1.1": ["consent", "informed"],
    "D5.1.2": ["refuse(s|d)? (surgery|treatment|the operation)", "against medical advice"],
    "D5.2.1": ["mental capacity act", "five principles", "unwise decision"],
    "D5.2.2": ["capacity", "able to decide", "understand retain"],
    "D5.3.1": ["gillick"],
    "D5.3.2": ["fraser", "contracept.*under 16", "under[- ]16.*contracept"],
    "D5.3.3": ["teenager .*(tell|parents)", "young person .*confidential"],
    "D5.4.1": ["confidential"],
    "D5.4.2": ["at risk", "harm to (others|someone else)", "public interest", "threat"],
    "D5.4.3": ["notifiable", "public health .*report", "required by law"],
    "D5.4.4": ["dvla", "driving", "fit to drive", "licence"],
    "D5.4.5": ["family (asks|wants) to know", "relative asks", "next of kin"],
    "D5.4.6": ["lift", "corridor", "overheard", "group chat"],
    "D5.4.7": ["friend tells you", "asks you not to tell", "promise (not to|you won'?t)"],
    "D5.5.1": ["safeguard", "bruise", "abuse", "neglect", "child protection"],
    "D5.5.2": ["designated safeguarding", "who would you report"],
    "D5.5.4": ["vulnerable adult", "adult at risk"],
    "D5.6.1": ["end of life", "palliative", "withdraw.*treatment", "life[- ]prolonging"],
    "D5.6.2": ["dnacpr", "do not resuscitate", "resuscitation"],
    "D5.6.3": ["assisted dying", "euthanasia", "assisted suicide", "dignitas"],
    "D5.6.4": ["conscientious objection", "abortion", "termination of pregnancy"],
    "D5.7.1": ["limited resources", "budget", "opportunity cost"],
    "D5.7.2": ["qaly", "nice", "cost[- ]effective", "expensive drug"],
    "D5.7.3": ["smoker", "alcohol.*liver", "lifestyle .*(treatment|priority)", "self[- ]inflicted"],
    "D5.7.4": ["individual (patient )?(versus|vs).*population", "society as a whole"],
    "D5.8.1": ["four (pillars|principles)", "autonomy.*beneficence", "medical ethics framework"],
    "D5.9.1": ["conflict of interest", "pharmaceutical (company|rep)", "funding from"],
    "D6.1.1": ["worked in a team", "team.?work", "group of people"],
    "D6.1.2": ["follow(er)?ship", "not the leader", "support(ed)? someone else's"],
    "D6.2.1": ["leader(ship)?", "led a"],
    "D6.2.2": ["delegat", "hand ?over"],
    "D6.3.1": ["conflict with", "disagreement with a (friend|peer|classmate)", "someone not pulling"],
    "D6.3.2": ["challenge (a|your) (senior|supervisor|consultant)", "speak up to"],
    "D6.3.3": ["not doing their (share|part)", "lazy team member"],
    "D6.3.4": ["racist", "sexist", "discriminat", "inappropriate (comment|joke)", "offensive remark"],
    "D6.3.5": ["nurse (disagrees|says)", "pharmacist", "physician associate", "allied health"],
    "D7.1.1": ["stress", "pressure", "demanding"],
    "D7.1.2": ["cope|coping", "manage stress", "relax", "unwind"],
    "D7.1.3": ["ask for help", "struggling", "mental health of doctors", "wellbeing"],
    "D7.1.4": ["work[- ]life balance", "switch off"],
    "D7.2.1": ["strength", "what are you good at"],
    "D7.2.2": ["weakness", "not good at", "improve about yourself"],
    "D8.1.1": ["prioritis|prioritiz", "which would you do first", "rank these"],
    "D8.1.2": ["can'?t do everything", "not enough time"],
    "D8.2.1": ["incomplete information", "don'?t have all the", "uncertain"],
    "D8.3.1": ["unsafe", "hazard", "danger", "speak up about"],
    "D8.3.2": ["near miss", "no harm", "incident report"],
    "D8.3.3": ["systems|system failure", "blame culture", "whose fault"],
    "D8.3.4": ["collapse", "first aid", "emergency in the street"],
    "D9.1.1": ["nhs (constitution|values)", "founding principles"],
    "D9.1.2": ["funded", "taxation", "free at the point"],
    "D9.1.3": ["primary care", "gp .*(role|gatekeeper)", "community care"],
    "D9.1.4": ["scotland|wales|northern ireland", "devolved"],
    "D9.1.5": ["nhs england.*abolish", "10 year", "ten year plan", "integrated care board", "reform of the nhs"],
    "D9.2.1": ["waiting (list|time)", "18[- ]week", "backlog", "elective"],
    "D9.2.2": ["strike", "industrial action", "junior doctor", "resident doctor.*pay", "bma"],
    "D9.2.3": ["workforce", "staff shortage", "recruit(ment|ing) (doctors|abroad)", "international medical graduate"],
    "D9.2.4": ["a&e", "emergency department", "corridor care", "four[- ]hour"],
    "D9.3.1": ["social determinants", "poverty", "deprivation", "housing.*health"],
    "D9.3.2": ["life expectancy", "healthy life expectancy"],
    "D9.3.3": ["inverse care law"],
    "D9.3.4": ["uptake", "ethnic", "vaccine coverage"],
    "D9.4.1": ["prevention", "public health"],
    "D9.4.2": ["nanny state", "sugar tax", "ban", "minimum unit", "smoking ban", "generational"],
    "D9.4.3": ["obesity", "weight[- ]loss", "ozempic", "glp[- ]?1", "tirzepatide", "semaglutide"],
    "D9.4.4": ["screening", "psa", "mammogram", "cervical"],
    "D9.4.5": ["vaccin", "immunis", "measles", "mmr", "anti[- ]vax"],
    "D9.4.6": ["antibiotic", "antimicrobial", "amr", "resistance"],
    "D9.5.1": ["social care", "discharge", "bed blocking", "care home funding"],
    "D9.5.2": ["private (healthcare|sector|hospital)", "privatis"],
    "D9.5.3": ["mental health (services|provision)", "camhs", "mental health act"],
    "D9.6.1": ["sustainab", "carbon", "climate", "environment"],
    "D9.6.2": ["brain drain", "recruiting from abroad", "overseas doctors"],
    "D10.1.1": ["why does .* happen", "explain the mechanism", "biolog", "chemistr", "physics"],
    "D10.2.1": ["correlation", "causation", "does that prove"],
    "D10.2.2": ["sample", "bias", "generalis"],
    "D10.2.3": ["relative risk", "absolute risk", "percent(age)? increase"],
    "D10.2.4": ["newspaper", "headline", "media report", "article"],
    "D10.3.1": ["calculate", "what percentage", "how many", "work out"],
    "D10.4.1": ["graph", "chart", "table shows", "data below"],
    "D10.4.2": ["what can'?t you conclude", "limitations of the data"],
    "D10.5.1": ["artificial intelligence", "\\bai\\b", "machine learning", "algorithm"],
    "D10.5.2": ["who is responsible.*ai", "ai.*(accountab|liab)"],
    "D10.5.3": ["ai.*bias", "deskill"],
    "D10.5.4": ["patient data", "data (privacy|sharing)", "palantir", "records shared"],
    "D10.5.5": ["digital exclusion", "nhs app", "no smartphone", "online access"],
    "D10.5.6": ["genom", "genetic", "dna"],
}

FORMAT_SIGNALS = [
    ("RP", [r"\brole ?play\b", r"you are (a|an) .*(volunteer|student|assistant).*speak to", r"^speak to\b", r"the actor", r"in role"]),
    ("IT", [r"give instructions", r"cannot see", r"back to back", r"describe .* so (that )?they can draw"]),
    ("EX", [r"^explain\b", r"explain (this|it|to) .*(child|patient|friend|someone)"]),
    ("PR", [r"prioritis|prioritiz", r"which would you do first", r"rank (these|the following)", r"order of importance"]),
    ("CA", [r"calculate", r"what percentage", r"how much", r"work out the"]),
    ("DI", [r"graph", r"chart", r"the table (shows|below)", r"data (shows|below)"]),
    ("AD", [r"read the (following|passage|article)", r"the article (says|argues)"]),
    ("PD", [r"should the nhs", r"do you think .*(should|policy)", r"what are the arguments (for|against)", r"is it right that"]),
    ("ES", [r"what would you do if", r"you discover", r"a (patient|friend|colleague|student) tells you", r"is it (ever )?(right|ethical|acceptable)"]),
    ("WE", [r"work experience", r"volunteer(ing)?", r"placement", r"what did you learn from"]),
    ("PE", [r"tell me about a time", r"give me an example of", r"describe a situation (where|when)", r"can you think of a time"]),
    ("SP", [r"why does .* happen", r"explain the mechanism", r"what would you expect to"]),
    ("GT", [r"as a group", r"with the other candidates", r"group (task|discussion|exercise)"]),
    ("AC", [r"in your personal statement", r"you (wrote|mentioned) (in your|on your) (application|personal statement)"]),
]

# Phrases that suggest a station demands more clinical knowledge than an applicant has
CLINICAL_OVERREACH = [
    r"\bdiagnos", r"\bprescrib", r"what (treatment|drug|medication)", r"\bdose\b", r"\bdosage\b",
    r"what is the (likely )?cause of (their|his|her) symptoms", r"how would you treat",
    r"\bprognos", r"break (the |)(bad |)news.{0,40}(cancer|diagnosis|tumour|terminal|has|died)",
    r"tell (the |)(patient|family|mrs|mr|him|her|them).{0,30}(they|he|she) (has|have|is)\\b", r"what investigations",
    r"differential", r"management plan", r"you are the (doctor|fy1|f1|junior doctor|consultant)",
]

LEADING_PATTERNS = [
    (r"don'?t you think", "leading — presupposes the answer"),
    (r"\bwouldn'?t you agree\b", "leading — invites agreement"),
    (r"\bsurely\b", "leading — signals the expected view"),
    (r"is it not (true|the case)", "leading — rhetorical framing"),
    (r"why is it important to", "presupposes importance rather than testing it"),
    (r"how would you demonstrate (empathy|integrity|resilience)", "names the attribute, so the candidate need only echo it"),
    (r"what are the four (pillars|principles)", "recall of a framework — scores vocabulary not judgement"),
    (r"using the four (pillars|principles)", "mandates a framework and rewards recitation"),
]

BUZZWORD_RISK = [
    (r"four (pillars|principles)", "rewards naming the four principles"),
    (r"nhs values", "rewards naming NHS Constitution values"),
    (r"gmc guidelines?", "rewards naming the GMC rather than applying it"),
    (r"duty of candour", "rewards naming the duty"),
    (r"mental capacity act", "rewards naming the Act"),
    (r"gillick", "rewards naming rather than applying"),
    (r"holistic", "vague evaluative term"),
    (r"mention(s|ed)? (the )?(word|term)", "explicit keyword matching in a scoring prompt"),
    (r"keyword", "explicit keyword matching in a scoring prompt"),
    (r"should (say|mention|state) ['\"]", "scores an exact phrase"),
]

TIME_SENSITIVE = [
    r"\bstrike", r"industrial action", r"\bcovid", r"coronavirus", r"pandemic", r"7[- ]day nhs", r"seven[- ]day nhs",
    r"junior doctor", r"waiting list", r"\bai\b", r"artificial intelligence", r"assisted dying", r"brexit",
    r"health secretary", r"streeting", r"hancock", r"javid", r"barclay", r"long term (workforce )?plan",
    r"physician associate", r"nhs england", r"integrated care", r"\bnice\b", r"monkeypox", r"mpox",
]


def norm(t):
    return re.sub(r"\s+", " ", t.lower().strip())


def classify_topic(text):
    t = norm(text)
    hits = []
    for tid, pats in TOPIC_SIGNALS.items():
        for p in pats:
            if re.search(p, t):
                hits.append((tid, len(p)))
                break
    if not hits:
        return None, 0.0, []
    hits.sort(key=lambda x: -x[1])
    conf = 0.75 if len(hits) == 1 else 0.55
    return hits[0][0], conf, [h[0] for h in hits]


def classify_format(text):
    t = norm(text)
    for code, pats in FORMAT_SIGNALS:
        for p in pats:
            if re.search(p, t):
                return code, 0.7
    return "DQ", 0.4


def flag(text, patterns):
    t = norm(text)
    out = []
    for p, why in patterns:
        if re.search(p, t):
            out.append(why)
    return out


def flag_simple(text, patterns):
    t = norm(text)
    return [p for p in patterns if re.search(p, t)]


STOP = set("what how why when where who which the a an and or of to in for on with you your "
           "would could should do does did is are was were be been being that this these it "
           "as at by from about into if not no yes can may might will".split())


def _tokens(t):
    return set(w for w in re.findall(r"[a-z]{3,}", t) if w not in STOP)


def find_duplicates(rows, threshold=0.82):
    """Jaccard blocking then sequence ratio. Compares every pair for small banks and
    blocks by shared content words for large ones. Never compares an item to itself."""
    items = [(r["_id"], norm(r["_text"])) for r in rows]
    toks = {rid: _tokens(t) for rid, t in items}
    text = dict(items)
    n = len(items)

    if n <= 2500:
        candidate_pairs = ((items[i][0], items[j][0]) for i in range(n) for j in range(i + 1, n))
    else:
        inv = defaultdict(set)
        for rid, tk in toks.items():
            for w in list(tk)[:12]:
                inv[w].add(rid)
        cp = set()
        for _, ids in inv.items():
            ids = sorted(ids)
            if len(ids) > 400:
                continue
            for i in range(len(ids)):
                for j in range(i + 1, len(ids)):
                    cp.add((ids[i], ids[j]))
        candidate_pairs = cp

    pairs = []
    for a, b in candidate_pairs:
        if a == b:
            continue
        ta, tb = toks[a], toks[b]
        if not ta or not tb:
            continue
        jac = len(ta & tb) / len(ta | tb)
        if jac < 0.35:
            continue
        ratio = SequenceMatcher(None, text[a], text[b]).ratio()
        score = max(ratio, jac)
        if score >= threshold or jac >= 0.75:
            pairs.append({"id_a": a, "id_b": b,
                          "similarity": round(score, 3), "jaccard": round(jac, 3),
                          "text_a": text[a][:160], "text_b": text[b][:160],
                          "verdict": "duplicate" if score >= 0.93 else "near-duplicate"})
    pairs.sort(key=lambda p: -p["similarity"])
    return pairs


def write_csv(path, rows, cols):
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=cols, extrasaction="ignore")
        w.writeheader()
        for r in rows:
            w.writerow(r)


def matrix(counter, total, key_name, extra=None):
    out = []
    for k, n in sorted(counter.items(), key=lambda x: -x[1]):
        row = {key_name: k, "count": n, "percent": round(100.0 * n / total, 1) if total else 0.0}
        if extra and k in extra:
            row.update(extra[k])
        out.append(row)
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", required=True)
    ap.add_argument("--outdir", default="out")
    ap.add_argument("--dup-threshold", type=float, default=0.82)
    a = ap.parse_args()

    leaves, domains = load_ontology()
    rows = load_rows(a.input)
    if not rows:
        sys.exit("No rows with usable text found. Expected a 'text' or 'question' column.")
    os.makedirs(a.outdir, exist_ok=True)
    total = len(rows)

    classified = []
    for r in rows:
        text = r["_text"]
        tid, tconf, alts = classify_topic(text)
        fmt, fconf = classify_format(text)
        leaf = leaves.get(tid, {})
        blob = " ".join([text, str(r.get("scoring_prompt", "")), str(r.get("follow_ups", ""))])
        classified.append({
            "id": r["_id"],
            "text": text[:400],
            "proposed_topic": tid or "UNCLASSIFIED",
            "proposed_topic_label": leaf.get("label", ""),
            "proposed_domain": leaf.get("domain", "UNCLASSIFIED"),
            "proposed_domain_label": leaf.get("domain_label", ""),
            "proposed_subdomain": leaf.get("subdomain", ""),
            "alternatives": ";".join(alts[1:4]),
            "topic_confidence": tconf,
            "proposed_format": fmt,
            "format_confidence": fconf,
            "temporality": leaf.get("temporality", ""),
            "clinical_knowledge": leaf.get("knowledge", ""),
            "premed_appropriate": leaf.get("premed", ""),
            "existing_category": r.get("category", ""),
            "existing_difficulty": r.get("difficulty", ""),
            "existing_university": r.get("university", ""),
            "is_roleplay": "yes" if fmt == "RP" else "no",
            "flag_clinical_overreach": "; ".join(flag_simple(text, CLINICAL_OVERREACH)),
            "flag_leading_or_poorly_phrased": "; ".join(w for _, w in [(p, w) for p, w in LEADING_PATTERNS if re.search(p, norm(text))]),
            "flag_buzzword_risk": "; ".join(w for p, w in BUZZWORD_RISK if re.search(p, norm(blob))),
            "flag_time_sensitive": "; ".join(flag_simple(text, TIME_SENSITIVE)),
            "needs_human_review": "YES" if (tconf < 0.6 or not tid) else "sample",
            "human_topic": "", "human_format": "", "human_verdict": "", "human_notes": "",
        })

    cls_cols = list(classified[0].keys())
    write_csv(os.path.join(a.outdir, "01_classification_worksheet.csv"), classified, cls_cols)

    # ---- matrices
    dom = Counter(c["proposed_domain"] for c in classified)
    dom_extra = {k: {"domain_label": domains.get(k, "UNCLASSIFIED")} for k in dom}
    write_csv(os.path.join(a.outdir, "02_matrix_by_domain.csv"),
              matrix(dom, total, "domain", dom_extra), ["domain", "domain_label", "count", "percent"])

    top = Counter(c["proposed_topic"] for c in classified)
    top_extra = {k: {"topic_label": leaves.get(k, {}).get("label", "")} for k in top}
    write_csv(os.path.join(a.outdir, "03_matrix_by_topic.csv"),
              matrix(top, total, "topic", top_extra), ["topic", "topic_label", "count", "percent"])

    write_csv(os.path.join(a.outdir, "04_matrix_by_format.csv"),
              matrix(Counter(c["proposed_format"] for c in classified), total, "format"),
              ["format", "count", "percent"])

    write_csv(os.path.join(a.outdir, "05_matrix_by_difficulty.csv"),
              matrix(Counter(c["existing_difficulty"] or "UNSET" for c in classified), total, "difficulty"),
              ["difficulty", "count", "percent"])

    write_csv(os.path.join(a.outdir, "06_matrix_by_university.csv"),
              matrix(Counter(c["existing_university"] or "UNSET/universal" for c in classified), total, "university"),
              ["university", "count", "percent"])

    write_csv(os.path.join(a.outdir, "07_matrix_roleplay.csv"),
              matrix(Counter(c["is_roleplay"] for c in classified), total, "roleplay"),
              ["roleplay", "count", "percent"])

    temporality = Counter(c["temporality"] or "UNKNOWN" for c in classified)
    for c in classified:
        if c["flag_time_sensitive"] and c["temporality"] in ("EVERGREEN", "", "UNKNOWN"):
            temporality["MISLABELLED_time_sensitive"] += 1
    write_csv(os.path.join(a.outdir, "08_matrix_temporality.csv"),
              matrix(temporality, total, "temporality"), ["temporality", "count", "percent"])

    # ---- gaps
    covered = set(top) - {"UNCLASSIFIED"}
    gaps = [{"topic": tid, "topic_label": v["label"], "domain": v["domain"], "domain_label": v["domain_label"],
             "suggested_formats": ";".join(v["formats"]), "temporality": v["temporality"],
             "premed_appropriate": str(v["premed"])}
            for tid, v in leaves.items() if tid not in covered]
    gaps.sort(key=lambda g: g["topic"])
    write_csv(os.path.join(a.outdir, "09_missing_topics.csv"), gaps,
              ["topic", "topic_label", "domain", "domain_label", "suggested_formats", "temporality", "premed_appropriate"])

    # ---- overrepresentation: >3x an even split across covered topics
    if covered:
        even = total / max(len(covered), 1)
        over = [{"topic": k, "topic_label": leaves.get(k, {}).get("label", ""), "count": v,
                 "percent": round(100.0 * v / total, 1), "times_even_share": round(v / even, 1)}
                for k, v in top.items() if k != "UNCLASSIFIED" and v > 3 * even]
        over.sort(key=lambda x: -x["count"])
        write_csv(os.path.join(a.outdir, "10_overrepresented_topics.csv"), over,
                  ["topic", "topic_label", "count", "percent", "times_even_share"])

    # ---- flags
    for name, key in [("11_flag_clinical_overreach.csv", "flag_clinical_overreach"),
                      ("12_flag_leading_or_poorly_phrased.csv", "flag_leading_or_poorly_phrased"),
                      ("13_flag_buzzword_risk.csv", "flag_buzzword_risk"),
                      ("14_flag_time_sensitive.csv", "flag_time_sensitive")]:
        sel = [c for c in classified if c[key]]
        write_csv(os.path.join(a.outdir, name), sel, ["id", "text", "proposed_topic", "proposed_format", key])

    dups = find_duplicates(rows, a.dup_threshold)
    write_csv(os.path.join(a.outdir, "15_duplicates.csv"), dups,
              ["verdict", "similarity", "jaccard", "id_a", "id_b", "text_a", "text_b"])

    # ---- summary
    summary = {
        "total_items": total,
        "unclassified": dom.get("UNCLASSIFIED", 0),
        "unclassified_pct": round(100.0 * dom.get("UNCLASSIFIED", 0) / total, 1),
        "distinct_topics_covered": len(covered),
        "total_topics_in_ontology": len(leaves),
        "topic_coverage_pct": round(100.0 * len(covered) / len(leaves), 1),
        "domains_covered": len([d for d in dom if d != "UNCLASSIFIED"]),
        "roleplay_items": sum(1 for c in classified if c["is_roleplay"] == "yes"),
        "roleplay_pct": round(100.0 * sum(1 for c in classified if c["is_roleplay"] == "yes") / total, 1),
        "duplicate_pairs": len([d for d in dups if d["verdict"] == "duplicate"]),
        "near_duplicate_pairs": len([d for d in dups if d["verdict"] == "near-duplicate"]),
        "clinical_overreach_flags": sum(1 for c in classified if c["flag_clinical_overreach"]),
        "leading_flags": sum(1 for c in classified if c["flag_leading_or_poorly_phrased"]),
        "buzzword_risk_flags": sum(1 for c in classified if c["flag_buzzword_risk"]),
        "time_sensitive_flags": sum(1 for c in classified if c["flag_time_sensitive"]),
        "needs_human_review": sum(1 for c in classified if c["needs_human_review"] == "YES"),
    }
    json.dump(summary, open(os.path.join(a.outdir, "00_summary.json"), "w"), indent=1)

    print(json.dumps(summary, indent=1))
    print(f"\nWrote 16 files to {os.path.abspath(a.outdir)}")
    print("NEXT: review every row in 01_classification_worksheet.csv where needs_human_review=YES,")
    print("plus a 10% random sample of the rest, before trusting the matrices.")


if __name__ == "__main__":
    main()
