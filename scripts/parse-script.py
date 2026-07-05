#!/usr/bin/env python3
"""
Convert a "Version 2/3" interview script (.md) into the engine's question-bank JSON.

Difficulty is the question's STAR rating from the doc's Quick Reference table (1 = easiest); the
category (Numerical / Deductive / ...) is kept as `questionType`. Files are grouped by star level:
    bank/questions/<subject>/<topic>/<star>.json
Run:  python3 scripts/parse-script.py maths
      python3 scripts/parse-script.py currentaffairs
"""
import json, re, sys, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent

SUBJECTS = {
    "maths": {
        "subject": "maths",
        "file": "interview-scripts/maths/Mathematical Thinking Script.md",
        "prefix": "MA", "out": "src/interview/bank/questions/maths",
        "discussion": False, "default_difficulty": 3,
        "sections": {"A": "numerical-reasoning", "B": "estimation",
                     "C": "structured-problem-solving", "D": "pattern-proof-explanation"},
        "labels": {},  # taken from the quick-ref table
    },
    "logic": {
        "subject": "logic",
        "file": "interview-scripts/logic/Logic and Reasoning Script.md",
        "prefix": "LG", "out": "src/interview/bank/questions/logic",
        "discussion": False, "default_difficulty": 3,
        "sections": {"A": "deductive-logic", "B": "lateral-thinking",
                     "C": "verbal-conceptual", "D": "language-logic"},
        "labels": {},
    },
    "currentaffairs": {
        "subject": "currentaffairs",
        "file": "interview-scripts/current-affairs/Current Affairs & Moral Script.md",
        "prefix": "CA", "out": "src/interview/bank/questions/currentaffairs",
        "discussion": True, "default_difficulty": 2,
        "sections": {"A": "current-news", "B": "technology-ai", "C": "climate-environment",
                     "D": "moral-dilemmas", "E": "society-rights-fairness"},
        "labels": {"A": "Current News", "B": "Technology & AI", "C": "Climate & Environment",
                   "D": "Moral Dilemmas", "E": "Society, Rights & Fairness"},
    },
}

LABELS = [
    ("answer", ["Final answer", "Valid answers", "Valid meanings", "Possible rules", "Answers"]),
    ("reasoning", ["Model reasoning path", "What a strong answer involves"]),
    ("rubric", ["Scoring rubric"]),
    ("mistakes", ["Common mistakes", "Common weak patterns"]),
    ("probes", ["Live probes / pushback", "Live probes"]),
    ("hints", ["Hints if stuck", "If the child is stuck"]),
]

def clean(t):
    t = t.replace("“", '"').replace("”", '"').replace("‘", "'").replace("’", "'")
    t = t.replace("—", "-").replace("–", "-")
    t = re.sub(r"\*\*(.+?)\*\*", r"\1", t)
    t = re.sub(r"(?<!\w)\*(.+?)\*(?!\w)", r"\1", t)
    return t.strip()

def parse_quickref(text):
    """From the Quick Reference table rows, map question id -> (stars:int, category:str)."""
    out = {}
    for line in text.split("\n"):
        m = re.match(r"^\|\s*([A-E]\d+)\s*\|[^|]*\|\s*([^|]*?)\s*\|\s*([★]+)", line)
        if m:
            out[m.group(1)] = (m.group(3).count("★"), m.group(2).strip())
    return out

def label_of(line):
    if not line.startswith("**"):
        return None
    for key, names in LABELS:
        for n in names:
            if line.startswith("**" + n):
                return key
    return None

def collapse(lines):
    return clean(" ".join(l.strip() for l in lines)).strip()

def parse_rubric(text):
    out = {}
    for band, key in (("Strong", "strong"), ("Developing", "developing"), ("Weak", "weak")):
        m = re.search(rf"{band}\*\*?\s*[-—–:]\s*(.*?)(?=(?:- )?\*\*?(?:Strong|Developing|Weak)\*\*|$)", text, re.S)
        out[key] = clean(m.group(1)) if m else ""
    return out

def split_bullets(lines):
    bullets, cur = [], []
    for l in lines:
        s = l.strip()
        if s.startswith("- "):
            if cur: bullets.append(" ".join(cur))
            cur = [s[2:]]
        elif s and cur:
            cur.append(s)
    if cur: bullets.append(" ".join(cur))
    return [clean(b) for b in bullets if clean(b)]

def split_numbered(lines):
    items, cur = [], []
    for l in lines:
        s = l.strip()
        if re.match(r"^\d+\.\s", s):
            if cur: items.append(" ".join(cur))
            cur = [re.sub(r"^\d+\.\s", "", s)]
        elif s and cur:
            cur.append(s)
    if cur: items.append(" ".join(cur))
    return [clean(i) for i in items if clean(i)]

def to_mistakes(bullets):
    out = []
    for b in bullets:
        mistake, reveals = (b.split(" - ", 1) if " - " in b else (b, "what this reveals about their thinking"))
        out.append({"mistake": mistake.strip(), "reveals": reveals.strip()})
    return out

def to_probes(bullets):
    out = []
    for b in bullets:
        m = re.search(r"\((.*?)\)\s*$", b)
        good = m.group(1).strip() if m else "engages thoughtfully and gives a reasoned response"
        probe = re.sub(r"\s*\(.*?\)\s*$", "", b).strip().strip('"')
        if probe: out.append({"probe": probe, "goodResponse": good})
    return out

def parse(subject):
    cfg = SUBJECTS[subject]
    text = (ROOT / cfg["file"]).read_text(encoding="utf-8")
    quickref = parse_quickref(text)
    lines, questions, section, i = text.split("\n"), [], None, 0
    while i < len(lines):
        line = lines[i]
        sm = re.match(r"^## SECTION ([A-E]) ", line)
        if sm: section = sm.group(1)
        qm = re.match(r"^### ([A-E]\d+)\s*[-—]\s*(.*)", line)
        if qm:
            qid, title = qm.group(1), clean(qm.group(2))
            j, block = i + 1, []
            while j < len(lines) and not re.match(r"^#{2,3} ", lines[j]):
                block.append(lines[j]); j += 1
            questions.append(parse_block(cfg, quickref, section, qid, title, block))
            i = j; continue
        i += 1
    return cfg, questions

def parse_block(cfg, quickref, section, qid, title, block):
    qlines, parts, cur_key = [], {}, None
    for l in block:
        key = label_of(l)
        if key:
            cur_key = key
            rest = re.sub(r"^\*\*[^*]+\*\*:?\s*", "", l)
            parts[cur_key] = [rest] if rest.strip() else []
        elif cur_key:
            if l.strip() == "---": cur_key = None
            else: parts[cur_key].append(l)
        elif l.strip().startswith(">"):
            qlines.append(l.strip().lstrip(">").strip())

    question = clean(" ".join(qlines)).strip().strip('"')
    # Some questions (e.g. escalating analogies) have no blockquote — fall back to the "Level 1" line.
    if not question:
        for l in block:
            m = re.search(r'Level 1[:\s]*"(.+?)"', clean(l))  # clean() normalises smart quotes/bold
            if m:
                question = m.group(1).strip(); break

    stars, category = quickref.get(qid, (cfg["default_difficulty"], None))
    difficulty = max(1, min(5, stars))
    question_type = category or cfg["labels"].get(section, section)

    q = {
        "id": f"{cfg['prefix']}-{qid}",
        "subject": cfg["subject"],
        "topic": cfg["sections"][section],
        "difficulty": difficulty,
        "questionType": question_type,
        "title": title,
        "tags": [],
        "question": question,
        "answer": clean(" ".join(parts.get("answer", []))) or
                  ("Open discussion - there is no single right answer; score the quality of reasoning." if cfg["discussion"] else "(no single answer)"),
        "modelReasoningPath": collapse(parts.get("reasoning", [])),
        "rubric": parse_rubric(" ".join(parts.get("rubric", []))),
        "commonMistakes": to_mistakes(split_bullets(parts.get("mistakes", []))),
        "liveProbes": to_probes(split_bullets(parts.get("probes", []))),
        "hints": split_numbered(parts.get("hints", [])),
    }
    return q

def main():
    subject = sys.argv[1]
    cfg, questions = parse(subject)
    outdir = ROOT / cfg["out"]
    if outdir.exists():
        import shutil; shutil.rmtree(outdir)
    groups = {}
    for q in questions:
        groups.setdefault((q["topic"], q["difficulty"]), []).append(q)
    for (topic, diff), items in groups.items():
        d = outdir / topic
        d.mkdir(parents=True, exist_ok=True)
        (d / f"{diff}.json").write_text(json.dumps(items, indent=2, ensure_ascii=False) + "\n")
    from collections import Counter
    dist = Counter(q["difficulty"] for q in questions)
    print(f"{subject}: {len(questions)} questions | star distribution {dict(sorted(dist.items()))}")

if __name__ == "__main__":
    main()
