import { CheckCircle2, Target } from "lucide-react";

type Kind = "well" | "ebi";
export interface NotesSection { kind: Kind | null; heading: string | null; lines: string[] }

const HEADINGS: [RegExp, Kind, string][] = [
  [/^(?:keep doing|what went well|strengths?)$/i, "well", "What went well"],
  [/^(?:practi[sc]e next|try next|even better if|next steps?)$/i, "ebi", "Even better if"],
];

/** Split generated notes into labelled sections; older notes used "Keep doing / Practise next". */
export function parseImprovementNotes(text: string): NotesSection[] {
  const sections: NotesSection[] = [];
  let current: NotesSection = { kind: null, heading: null, lines: [] };
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const bare = line.replace(/^#+\s*/, "").replace(/\*\*/g, "").replace(/:$/, "").trim();
    const match = HEADINGS.find(([re]) => re.test(bare));
    if (match) {
      if (current.heading || current.lines.length) sections.push(current);
      current = { kind: match[1], heading: match[2], lines: [] };
    } else {
      current.lines.push(line.replace(/^[-•*]\s+/, ""));
    }
  }
  if (current.heading || current.lines.length) sections.push(current);
  return sections;
}

export function ImprovementNotes({ text }: { text: string }) {
  const sections = parseImprovementNotes(text);
  return (
    <div className="mt-4 space-y-4">
      {sections.map((s, i) => (
        <section key={i} className={s.kind === "ebi" ? "rounded-xl border border-primary/30 bg-primary/5 p-4" : s.kind ? "rounded-xl border p-4" : ""}>
          {s.heading && (
            <h4 className="mb-2 flex items-center gap-2 text-base font-semibold text-foreground">
              {s.kind === "ebi" ? <Target className="h-4 w-4 text-primary" aria-hidden /> : <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden />}
              {s.heading}
            </h4>
          )}
          {s.lines.length > 1 ? (
            <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed">
              {s.lines.map((l, j) => <li key={j}>{l}</li>)}
            </ul>
          ) : (
            <p className="text-sm leading-relaxed">{s.lines[0]}</p>
          )}
        </section>
      ))}
    </div>
  );
}
