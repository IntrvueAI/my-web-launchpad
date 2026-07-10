#!/usr/bin/env python3
"""
Parse the current interview docs in `Mini interview documents/` into the engine's question bank.

New doc format (per question):
    ### A1 — Title
    > "the question"
    **Answer:** ...            (maths/logic only; current-affairs is discussion)
    **Working:** / **Why:** ...
    **What a strong response looks like:** / **What a weak response looks like:**  (current-affairs)
    **What to listen for:** ...
Difficulty (stars) is read from each doc's "## Quick Reference" table; current-affairs has no
stars, so it uses the subject default. Output: bank/questions/<subject>/<topic>/<star>.json
Run:  python3 scripts/parse-mini-docs.py
"""
import json, re, pathlib, shutil

ROOT = pathlib.Path(__file__).resolve().parent.parent
DOCS = ROOT / "Mini interview documents"

SUBJECTS = {
    "maths": {
        "file": "Mathematical Thinking Qs.md", "prefix": "MA", "default": 3, "discussion": False,
        "sections": {"A": ("numerical-reasoning", "Numerical Reasoning"), "B": ("estimation", "Estimation"),
                     "C": ("structured-problem-solving", "Structured Problem Solving"),
                     "D": ("pattern-proof-explanation", "Pattern, Proof & Explanation")},
    },
    "logic": {
        "file": "Logic and Reasoning Qs.md", "prefix": "LG", "default": 3, "discussion": False,
        "sections": {"A": ("deductive-logic", "Deductive Logic"), "B": ("lateral-thinking", "Lateral Thinking"),
                     "C": ("verbal-conceptual", "Verbal & Conceptual Reasoning"),
                     "D": ("language-logic", "Language Logic & Word Puzzles")},
    },
    "currentaffairs": {
        "file": "Current Affairs & Moral Dilemmas.md", "prefix": "CA", "default": 2, "discussion": True,
        "sections": {"A": ("current-news", "Current News & World Affairs"), "B": ("technology-ai", "Technology & AI"),
                     "C": ("climate-environment", "Climate & The Environment"), "D": ("moral-dilemmas", "Moral Dilemmas"),
                     "E": ("society-rights-fairness", "Society, Rights & Fairness")},
    },
    "elevenplus": {
        "file": "11+ Interview Questions.md", "prefix": "EP", "default": 2, "discussion": True,
        "sections": {"A": ("personal-insight", "Personal Insight"), "B": ("reasoning", "Reasoning & Thinking Aloud"),
                     "C": ("extracurricular", "Extracurricular"), "D": ("current-affairs-ethics", "Current Affairs & Ethics")},
    },
}

DISCUSSION_ANSWER = "Discussion question — there is no single correct answer. Assess the reasoning, honesty and perspective-taking, not a 'right' response."


def clean(t: str) -> str:
    t = t.replace("“", '"').replace("”", '"').replace("‘", "'").replace("’", "'")
    t = t.replace("—", "-").replace("–", "-")
    t = re.sub(r"\*\*(.+?)\*\*", r"\1", t)                    # bold
    t = re.sub(r"(?<!\w)\*(.+?)\*(?!\w)", r"\1", t)           # italics
    return re.sub(r"\s+", " ", t).strip()


def quickref_stars(text: str) -> dict:
    out = {}
    for line in text.splitlines():
        m = re.match(r"^\|\s*([A-E]\d+)\s*\|[^|]*\|[^|]*\|\s*([★]+)", line)
        if m:
            out[m.group(1)] = m.group(2).count("★")
    return out


def field(block, *names):
    """Return the text after **Name:** up to the next **Bold:** label or end of block."""
    for n in names:
        m = re.search(r"\*\*" + re.escape(n) + r":?\*\*:?\s*(.*?)(?=\n\*\*[A-Z]|\Z)", block, re.S)
        if m:
            return clean(m.group(1))
    return None


def parse_subject(key: str, cfg: dict) -> list:
    text = (DOCS / cfg["file"]).read_text(encoding="utf-8")
    stars = quickref_stars(text)
    # split into question blocks on '### <id> — <title>'
    blocks = re.split(r"\n(?=### [A-E]\d+)", text)
    rows = []
    for b in blocks:
        h = re.match(r"### ([A-E]\d+)\s*[—-]\s*(.+)", b)
        if not h:
            continue
        qid, title = h.group(1), h.group(2)
        title = clean(re.sub(r"\*\(.*?\)\*", "", title))  # drop "*(always ask this first)*"
        section = qid[0]
        if section not in cfg["sections"]:
            continue
        topic, qtype = cfg["sections"][section]
        # Capture the FULL blockquote — questions can span several '>' lines (e.g. an intro plus a
        # list of analogies or group members). Grab every contiguous '>' line, then clean.
        qlines = []
        for line in b.split("\n"):
            s = line.strip()
            if s.startswith(">"):
                qlines.append(s.lstrip(">").strip())
            elif qlines:
                break
        if not qlines:
            continue
        question = clean(" ".join(l for l in qlines if l).strip().strip('"').strip())
        if cfg["discussion"]:
            answer = DISCUSSION_ANSWER
            parts = [("A strong response", field(b, "What a strong response looks like")),
                     ("A weak response", field(b, "What a weak response looks like")),
                     ("What to listen for", field(b, "What to listen for"))]
        else:
            answer = field(b, "Answer", "Final answer") or "(see working)"
            parts = [(None, field(b, "Working", "Why", "Model reasoning path")),
                     ("What to listen for", field(b, "What to listen for"))]
        reasoning = "\n\n".join((f"{lbl}: {val}" if lbl else val) for lbl, val in parts if val).strip()
        rows.append({
            "id": f"{cfg['prefix']}-{qid}", "subject": key, "topic": topic,
            "difficulty": stars.get(qid, cfg["default"]), "questionType": qtype,
            "title": title, "tags": [], "question": question, "answer": answer,
            **({"modelReasoningPath": reasoning} if reasoning else {}),
        })
    return rows


def main():
    all_rows = []
    for key, cfg in SUBJECTS.items():
        rows = parse_subject(key, cfg)
        all_rows += rows
        # rewrite the folder bank (remove old, group by topic/star)
        outdir = ROOT / "src/interview/bank/questions" / key
        if outdir.exists():
            shutil.rmtree(outdir)
        grouped = {}
        for r in rows:
            grouped.setdefault((r["topic"], r["difficulty"]), []).append(r)
        for (topic, star), qs in grouped.items():
            d = outdir / topic
            d.mkdir(parents=True, exist_ok=True)
            (d / f"{star}.json").write_text(json.dumps(qs, indent=2, ensure_ascii=False), encoding="utf-8")
        print(f"{key}: {len(rows)} questions across {len({r['topic'] for r in rows})} topics")
    print(f"TOTAL: {len(all_rows)} questions")


if __name__ == "__main__":
    main()
