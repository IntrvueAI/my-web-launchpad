import { lazy, Suspense, useState } from "react";
import { Clock, ArrowRight } from "lucide-react";
import { INTERVIEW_TYPES, type InterviewType } from "@/config/interviewTypes";
import { MEDICINE_PRACTICE_MODES } from "@/interview/subjects/medicine/practiceModes";
const MedicineStudio = lazy(
  () => import("@/components/medicine-studio/MedicineStudio"),
);
export function MedicinePractice({
  onStartInterview,
  scope = "guest",
}: {
  onStartInterview: (type: InterviewType) => void;
  scope?: string;
}) {
  const [mode, setMode] = useState<"quick" | "circuit" | "solo">("quick");
  return (
    <div className="space-y-6 text-foreground">
      <header>
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">
          Make one answer better
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold">
          Your practice, your pace
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Start with one focused station. Get feedback while your answer is
          fresh.
        </p>
      </header>
      <div className="flex flex-wrap gap-2" aria-label="Practice format">
        {(
          [
            { id: "quick", label: "5-minute stations" },
            { id: "circuit", label: "Full mocks" },
            { id: "solo", label: "Solo practice studio" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setMode(tab.id)}
            aria-pressed={mode === tab.id}
            className="min-h-11 rounded-xl border bg-card px-4 py-3 text-sm font-semibold aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground"
          >
            {tab.label}
          </button>
        ))}
      </div>
      {mode === "solo" ? (
        <Suspense fallback={<p role="status">Opening your practice desk…</p>}>
          <MedicineStudio
            key={scope}
            scope={scope}
            compact
            onStartLive={() => setMode("quick")}
          />
        </Suspense>
      ) : mode === "quick" ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            {MEDICINE_PRACTICE_MODES.map((practice, index) => (
              <article
                key={practice.id}
                className="flex min-w-0 flex-col rounded-2xl border bg-card p-5 sm:p-6"
              >
                <span className="text-xs font-semibold tracking-widest text-primary">
                  0{index + 1} · ONE STATION
                </span>
                <h2 className="mt-3 font-display text-xl font-semibold">
                  {practice.label}
                </h2>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">
                  {practice.description}
                </p>
                <p className="mt-5 flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  1 minute reading · 5 minutes answering
                </p>
                <button
                  onClick={() => onStartInterview(INTERVIEW_TYPES[practice.id])}
                  className="mt-4 flex min-h-11 items-center justify-between rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground"
                >
                  Start station
                  <ArrowRight className="h-4 w-4" />
                </button>
              </article>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-card p-5">
            <div>
              <h2 className="font-semibold">
                Improve the answer you just gave
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Your station feedback includes a practical structure or a suggested rewrite, with space to try it in your own words.
              </p>
            </div>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            Choose a general mock or a school-specific format. The timer stays visible and alerts you in the final minute of each station.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {["medicine-mmi-practice", "medicine-mmi", "medicine-mmi-manchester"].map((id) => {
              const type = INTERVIEW_TYPES[id];
              return (
                <article key={id} className="rounded-2xl border bg-card p-6">
                  <p className="text-xs font-semibold uppercase tracking-widest text-primary">
                    Full circuit
                  </p>
                  <h2 className="mt-3 font-display text-xl font-semibold">
                    {type.name}
                  </h2>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    {type.description}
                  </p>
                  <p className="mt-4 text-sm font-medium">
                    {id === 'medicine-mmi-practice' ? '6 stations · 1 minute reading + 5 minutes answering each' : id === "medicine-mmi"
                      ? "8 stations · 64 minutes of station time"
                      : "5 stations · 40 minutes of station time"}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Allow a little extra time for introductions and transitions.
                  </p>
                  <button
                    onClick={() => onStartInterview(type)}
                    className="mt-5 min-h-11 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
                  >
                    Start full circuit
                  </button>
                </article>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
