import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, BookOpen, Check, Search } from "lucide-react";
import { PRACTICE_EXAMPLES } from "@/data/practice-examples";
import { useAuth } from "@/contexts/AuthContext";
import { MedicineTheme } from "@/components/medicine-dashboard/MedicineTheme";
import { censorTranscript } from "@/interview/shared/transcript";
import { MedicineMMIExamples } from "@/components/medicine/MedicineMMIExamples";
import { isMedicineSite } from '@/lib/site';

export function PracticeExamplesContent({
  medicine = true,
}: {
  medicine?: boolean;
}) {
  return medicine ? <MedicineMMIExamples /> : <SchoolExamplesContent />;
}

function SchoolExamplesContent() {
  const [params] = useSearchParams();
  const requested = params.get("interview") ?? "";
  const examples = PRACTICE_EXAMPLES.filter(
    (example) => example.topic === "11+",
  );
  const initial =
    examples.find((example) => example.interviewType === requested) ??
    examples[0];
  const [selectedId, setSelectedId] = useState(initial.id);
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState("All topics");
  const [revealed, setRevealed] = useState(false);
  const [draft, setDraft] = useState("");
  const [checked, setChecked] = useState<number[]>([]);
  const { user } = useAuth();
  const selected =
    examples.find((example) => example.id === selectedId) ?? initial;
  const storageKey = `intrvue:example:${user?.id ?? "guest"}:${selected.id}`;
  useEffect(() => {
    setRevealed(false);
    setChecked([]);
    try {
      setDraft(localStorage.getItem(storageKey) ?? "");
    } catch {
      setDraft("");
    }
  }, [storageKey]);
  const filtered = examples.filter(
    (example) =>
      (topic === "All topics" || example.topic === topic) &&
      `${example.title} ${example.question}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  function saveDraft(value: string) {
    setDraft(value);
    try {
      localStorage.setItem(storageKey, value);
    } catch {
      /* The editor remains usable when storage is unavailable. */
    }
  }
  return (
    <div className="practice-examples space-y-6 text-foreground">
      <header>
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">
          Learn by doing
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold">
          Worked answers
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Try your own answer, then compare the reasoning. These original
          examples show a useful approach; adapt them to your own experiences.
        </p>
      </header>
      <div className="grid items-start gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="min-w-0 space-y-3" aria-label="Example library">
          <label className="flex items-center gap-2 rounded-xl border bg-card px-3">
            <Search className="h-4 w-4 shrink-0" />
            <input
              aria-label="Search worked answers"
              placeholder="Search examples"
              className="min-w-0 w-full bg-transparent py-3 text-sm outline-none"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <select
            aria-label="Filter examples by topic"
            value={topic}
            onChange={(event) => setTopic(event.target.value)}
            className="w-full rounded-xl border bg-card p-3 text-sm"
          >
            {[
              "All topics",
              ...new Set(examples.map((example) => example.topic)),
            ].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
            {filtered.map((example) => (
              <button
                key={example.id}
                aria-pressed={selected.id === example.id}
                onClick={() => setSelectedId(example.id)}
                className={`rounded-xl border p-4 text-left transition-colors ${selected.id === example.id ? "border-primary bg-primary/10" : "bg-card hover:bg-muted"}`}
              >
                <span className="text-xs text-muted-foreground">
                  {example.topic}
                </span>
                <span className="mt-1 block text-sm font-semibold">
                  {example.title}
                </span>
              </button>
            ))}
          </div>
          {!filtered.length && (
            <div className="rounded-xl border p-4 text-sm">
              No examples match.
              <button
                className="mt-2 block font-semibold underline"
                onClick={() => {
                  setQuery("");
                  setTopic("All topics");
                }}
              >
                Clear filters
              </button>
            </div>
          )}
        </aside>
        <article className="min-w-0 space-y-4">
          <section className="rounded-2xl border bg-card p-5 sm:p-7">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">
              01 · Your attempt
            </p>
            <h2 className="mt-3 font-display text-xl font-semibold">
              {selected.title}
            </h2>
            <p className="mt-3 text-base leading-relaxed">
              {selected.question}
            </p>
            <label
              htmlFor="example-attempt"
              className="mt-5 block text-sm font-medium"
            >
              Outline your answer
            </label>
            <textarea
              id="example-attempt"
              value={draft}
              onChange={(event) => saveDraft(event.target.value)}
              maxLength={6000}
              rows={5}
              placeholder="What would you clarify? How would you reason it through? What would you do next?"
              className="mt-2 w-full resize-y rounded-xl border bg-background p-4 text-sm leading-relaxed"
            />
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>Notes stay in this browser.</span>
              <span>{draft.length}/6,000</span>
            </div>
            <button
              onClick={() => setRevealed((value) => !value)}
              aria-expanded={revealed}
              className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-foreground px-5 py-3 text-sm font-semibold text-background"
            >
              <BookOpen className="h-4 w-4" />
              {revealed ? "Hide worked answer" : "Compare with a worked answer"}
            </button>
          </section>
          {revealed && (
            <section className="space-y-5 rounded-2xl border bg-card p-5 sm:p-7">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                  02 · Notice the reasoning
                </p>
                <h3 className="mt-2 text-lg font-semibold">
                  One possible answer
                </h3>
                <p className="mt-3 text-sm leading-7">{selected.answer}</p>
              </div>
              <div>
                <h3 className="font-semibold">Why this approach helps</h3>
                <ul className="mt-3 space-y-3">
                  {selected.why.map((point, index) => (
                    <li key={point}>
                      <label className="flex cursor-pointer items-start gap-3 text-sm">
                        <input
                          type="checkbox"
                          className="mt-1 accent-primary"
                          checked={checked.includes(index)}
                          onChange={() =>
                            setChecked((values) =>
                              values.includes(index)
                                ? values.filter((value) => value !== index)
                                : [...values, index],
                            )
                          }
                        />
                        <span>{point}</span>
                      </label>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-xs text-muted-foreground">
                  Tick the points your own answer demonstrates. This is
                  self-review, not an AI score.
                </p>
              </div>
              <div className="rounded-xl bg-muted p-4 text-sm">
                <strong>A common trap</strong>
                <p className="mt-2 leading-relaxed">{selected.avoid}</p>
              </div>
              <div>
                <h3 className="flex items-center gap-2 font-semibold">
                  <Check className="h-4 w-4 text-primary" />
                  03 · Try it again
                </h3>
                <p className="mt-2 text-sm">{selected.challenge}</p>
                {draft && (
                  <details className="mt-3 text-sm">
                    <summary className="cursor-pointer font-medium">
                      Review your own answer
                    </summary>
                    <p className="mt-2 whitespace-pre-wrap leading-relaxed">
                      {censorTranscript(draft)}
                    </p>
                  </details>
                )}
              </div>
              {selected.source && (
                <a
                  href={selected.source}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block text-xs underline underline-offset-4"
                >
                  Related official guidance ·{" "}
                  {selected.source.includes("gmc-")
                    ? "GMC"
                    : "Medical Schools Council"}
                </a>
              )}
            </section>
          )}
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-semibold underline underline-offset-4"
          >
            Back to your practice dashboard
            <ArrowRight className="h-4 w-4" />
          </Link>
        </article>
      </div>
    </div>
  );
}
export default function PracticeExamples() {
  const medicine = isMedicineSite() || window.location.pathname.startsWith("/medicine");
  return (
    <MedicineTheme enabled={medicine}>
      <main className="min-h-screen bg-background px-4 py-6 pb-28 text-foreground sm:px-6">
        <div className="mx-auto max-w-6xl">
          <Link
            to={medicine ? "/?mode=medicine" : "/"}
            className="mb-6 inline-flex items-center gap-2 text-sm font-semibold"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to dashboard
          </Link>
          <PracticeExamplesContent medicine={medicine} />
        </div>
      </main>
    </MedicineTheme>
  );
}
