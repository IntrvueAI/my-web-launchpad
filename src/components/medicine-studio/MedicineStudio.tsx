import { useMemo, useState } from "react";
import {
  ArrowRight,
  Bookmark,
  BookOpen,
  CalendarDays,
  Check,
  ChevronRight,
  Download,
  Headphones,
  Search,
  Target,
} from "lucide-react";
import { getStudioBank } from "@/interview/studio/bank";
import {
  addAttempt,
  CONFIDENCE,
  emptyProfile,
  latestAttempts,
  localDay,
  practiceQueue,
  TOPICS,
  weekActivity,
  type PracticeProfile,
} from "@/interview/studio/practice";
import { PracticeSession } from "./PracticeSession";
import ExperienceJournal from "./ExperienceJournal";
import PracticeImport from "./PracticeImport";
import { practiceCalendar, practiceDates } from "@/interview/studio/calendar";
import { usePracticeProfile } from "./usePracticeProfile";
import "./medicine-studio.css";

const schoolNotes = {
  general: {
    name: "General medicine",
    text: "Build transferable reasoning, reflection and communication skills across the library.",
  },
  oxford: {
    name: "Oxford",
    text: "Make your reasoning visible: explain an observation, test a hypothesis and consider what would change your mind. The studio is general solo practice; Oxford’s academic interview pilot remains in review.",
  },
  cambridge: {
    name: "Cambridge",
    text: "Practise thinking through evidence and adapting when new information appears. The studio is general solo practice; Cambridge’s academic interview pilot remains in review.",
  },
  imperial: {
    name: "Imperial",
    text: "Practise explaining your reasoning clearly and reflecting on your experiences. The school-specific MMI pilot remains in review; these solo timers are your own practice settings.",
  },
};
function downloadProfile(profile: PracticeProfile) {
  const url = URL.createObjectURL(
    new Blob(
      [
        JSON.stringify(
          {
            exportedAt: new Date().toISOString(),
            kind: "medicine-self-practice",
            ...profile,
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    ),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = "my-medicine-practice.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
/** Parent keys this component by account scope, so an account change cannot carry local notes across. */
export default function MedicineStudio({
  scope = "guest",
  compact = false,
  onStartLive,
  initialQuestionId = "",
  initialTopic = "",
}: {
  scope?: string;
  compact?: boolean;
  onStartLive?: () => void;
  initialQuestionId?: string;
  initialTopic?: string;
}) {
  const { profile, update, error } = usePracticeProfile(scope);
  const validInitialTopic = Object.prototype.hasOwnProperty.call(
    TOPICS,
    initialTopic,
  )
    ? initialTopic
    : "all";
  const [tab, setTab] = useState<"plan" | "library" | "history" | "stories">(
    validInitialTopic !== "all" ? "library" : "plan",
  );
  const [selected, setSelected] = useState(initialQuestionId);
  const [sessionKey, setSessionKey] = useState(0);
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState(validInitialTopic);
  const [level, setLevel] = useState("all");
  const [onlyBookmarks, setOnlyBookmarks] = useState(false);
  const [settings, setSettings] = useState(false);
  const [clearing, setClearing] = useState(false);
  const bank = getStudioBank();
  const latest = latestAttempts(profile.attempts);
  const queue = practiceQueue(bank, profile);
  const activity = weekActivity(profile.attempts);
  const days = activity.filter((d) => d.completed).length;
  const dueCount = bank.filter(
    (q) =>
      latest.has(q.id) && Date.parse(latest.get(q.id)!.revisitAt) <= Date.now(),
  ).length;
  const upcomingDates = practiceDates(profile.goal, localDay(Date.now()));
  function exportCalendar() {
    const url = URL.createObjectURL(
      new Blob([practiceCalendar(profile.goal, localDay(Date.now()))], {
        type: "text/calendar;charset=utf-8",
      }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "my-medicine-practice.ics";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const filtered = useMemo(
    () =>
      bank.filter(
        (q) =>
          (topic === "all" || q.topic === topic) &&
          (level === "all" || q.difficulty === Number(level)) &&
          (!onlyBookmarks || profile.bookmarks.includes(q.id)) &&
          `${q.title} ${TOPICS[q.topic]} ${q.tags?.join(" ")}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [bank, topic, level, onlyBookmarks, profile.bookmarks, query],
  );
  const question = bank.find((q) => q.id === selected);
  function start(id: string) {
    setSelected(id);
    setSessionKey((k) => k + 1);
  }
  function goal(patch: Partial<PracticeProfile["goal"]>) {
    update((old) => ({ ...old, goal: { ...old.goal, ...patch } }));
  }
  function bookmark(id: string) {
    update((old) => ({
      ...old,
      bookmarks: old.bookmarks.includes(id)
        ? old.bookmarks.filter((q) => q !== id)
        : [...old.bookmarks, id],
    }));
  }
  const next = queue.find((q) => q.question.id !== selected);
  if (question)
    return (
      <div className="medicine-studio">
        {error && (
          <p className="studio-notice" role="alert">
            {error}
          </p>
        )}
        <PracticeSession
          key={`${selected}-${sessionKey}`}
          question={question}
          previous={latest.get(question.id)}
          onSave={(attempt) => update((old) => addAttempt(old, attempt))}
          onClose={() => setSelected("")}
          onNext={next ? () => start(next.question.id) : undefined}
        />
      </div>
    );
  return (
    <div className={`medicine-studio ${compact ? "studio-embedded" : ""}`}>
      <header className="studio-heading">
        <div>
          <span className="studio-eyebrow">THE PRACTICE STUDIO</span>
          <h1>
            A little practice.
            <br />A clearer voice.
          </h1>
          <p>
            Find your words, reflect on your reasoning, and make your next
            answer stronger.
          </p>
        </div>
        <div className="studio-heading-note">
          <Headphones size={24} />
          <span>
            Just you and the question.
            <br />
            <b>Free solo practice · no credits</b>
          </span>
        </div>
      </header>
      <div className="studio-tabs" role="tablist" aria-label="Practice studio">
        {[
          { id: "plan", label: "My plan", icon: Target },
          { id: "library", label: "Library", icon: Search },
          { id: "history", label: "Reflections", icon: CalendarDays },
          { id: "stories", label: "Story bank", icon: BookOpen },
        ].map((t) => (
          <button
            key={t.id}
            id={`studio-tab-${t.id}`}
            role="tab"
            aria-selected={tab === t.id}
            aria-controls={`studio-panel-${t.id}`}
            tabIndex={tab === t.id ? 0 : -1}
            onKeyDown={(e) => {
              if (["ArrowRight", "ArrowLeft", "Home", "End"].includes(e.key)) {
                e.preventDefault();
                const tabs = ["plan", "library", "history", "stories"] as const;
                const i =
                  e.key === "Home"
                    ? 0
                    : e.key === "End"
                      ? 3
                      : (tabs.indexOf(tab) + (e.key === "ArrowRight" ? 1 : 3)) %
                        4;
                setTab(tabs[i]);
                document.getElementById(`studio-tab-${tabs[i]}`)?.focus();
              }
            }}
            onClick={() => setTab(t.id as typeof tab)}
          >
            <t.icon size={16} />
            {t.label}
          </button>
        ))}
      </div>
      {error && (
        <p className="studio-notice" role="alert">
          {error}
        </p>
      )}
      <section
        role="tabpanel"
        id={`studio-panel-${tab}`}
        aria-labelledby={`studio-tab-${tab}`}
      >
        {tab === "plan" && (
          <>
            <div className="studio-plan-grid">
              <article className="studio-today">
                <div className="studio-inline studio-between">
                  <span className="studio-eyebrow">YOUR NEXT SMALL STEP</span>
                  <span className="studio-tag">
                    {profile.goal.minutes} MIN ROUTINE
                  </span>
                </div>
                <h2>{queue[0]?.question.title ?? "A good time to reflect."}</h2>
                <p>
                  {queue[0]
                    ? `${queue[0].reason}. Answer first, then compare your reasoning and choose one thing to improve.`
                    : "You have tried every available question in this focus. Revisit from the library or broaden your plan."}
                </p>
                {queue[0] ? (
                  <button
                    className="studio-button"
                    onClick={() => start(queue[0].question.id)}
                  >
                    Start my practice <ArrowRight size={17} />
                  </button>
                ) : (
                  <button
                    className="studio-button"
                    onClick={() => setTab("library")}
                  >
                    Explore the library <ArrowRight size={17} />
                  </button>
                )}
                <div className="studio-today-footer">
                  <span>{dueCount} ready to revisit</span>
                  <span>{latest.size} prompts attempted</span>
                </div>
              </article>
              <article className="studio-card studio-week">
                <div className="studio-inline studio-between">
                  <span className="studio-eyebrow">YOUR LAST 7 DAYS</span>
                  <CalendarDays size={17} />
                </div>
                <h2>
                  {days}
                  <span> / {profile.goal.days} practice days</span>
                </h2>
                <div className="studio-week-strip">
                  {activity.map((d) => (
                    <div
                      key={d.day}
                      title={`${d.day}: ${d.completed} reflections`}
                    >
                      <span className={d.completed ? "completed" : ""}>
                        {d.completed ? (
                          <Check size={15} />
                        ) : (
                          new Date(d.day + "T12:00:00").toLocaleDateString(
                            "en-GB",
                            { day: "numeric" },
                          )
                        )}
                      </span>
                      <small>
                        {new Date(d.day + "T12:00:00").toLocaleDateString(
                          "en-GB",
                          { weekday: "narrow" },
                        )}
                      </small>
                    </div>
                  ))}
                </div>
                <p>
                  Consistency, at your pace. A saved reflection counts as a
                  practice day.
                </p>
                <button
                  className="studio-quiet"
                  onClick={() => setSettings((v) => !v)}
                >
                  {settings
                    ? "Close my preferences"
                    : "Adjust my practice plan"}{" "}
                  <ChevronRight size={15} />
                </button>
              </article>
            </div>
            {settings && (
              <section className="studio-card studio-plan-settings">
                <h3>A plan that fits you</h3>
                <div className="studio-filter-grid">
                  <label>
                    Daily routine
                    <select
                      value={profile.goal.minutes}
                      onChange={(e) =>
                        goal({ minutes: Number(e.target.value) as 5 | 10 | 15 })
                      }
                    >
                      <option value={5}>5 minutes</option>
                      <option value={10}>10 minutes</option>
                      <option value={15}>15 minutes</option>
                    </select>
                  </label>
                  <label>
                    Practice days per week
                    <select
                      value={profile.goal.days}
                      onChange={(e) =>
                        goal({ days: Number(e.target.value) as 3 | 5 | 7 })
                      }
                    >
                      <option value={3}>3 days</option>
                      <option value={5}>5 days</option>
                      <option value={7}>7 days</option>
                    </select>
                  </label>
                  <label>
                    My focus
                    <select
                      value={profile.goal.focus}
                      onChange={(e) => goal({ focus: e.target.value })}
                    >
                      <option value="all">A balanced mix</option>
                      {Object.entries(TOPICS).map(([id, name]) => (
                        <option key={id} value={id}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    My priority
                    <select
                      value={profile.goal.school}
                      onChange={(e) =>
                        goal({
                          school: e.target
                            .value as PracticeProfile["goal"]["school"],
                        })
                      }
                    >
                      {Object.entries(schoolNotes).map(([id, s]) => (
                        <option key={id} value={id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <p className="studio-small">
                  Your routine includes answering and reflection. Review
                  intervals of 1, 3 or 7 days follow your own confidence rating.
                </p>
              </section>
            )}
            <details className="studio-calendar studio-details">
              <summary>Put a little practice in your calendar</summary>
              <p>
                Download a two-week plan of {profile.goal.days} practice days
                per week, starting today. Import it into your calendar, then
                move the entries to times that suit you.
              </p>
              <label className="studio-field">
                Interview date, if you know it
                <input
                  type="date"
                  value={profile.goal.interviewDate}
                  onChange={(e) => goal({ interviewDate: e.target.value })}
                />
              </label>
              <p className="studio-small">
                Your practice entries stop before this date. The date stays in
                this browser.
              </p>
              <div
                className="studio-calendar-dates"
                aria-label="Planned practice dates"
              >
                {upcomingDates.map((date) => (
                  <span key={date}>
                    {new Date(date + "T12:00:00").toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                ))}
              </div>
              <button
                className="studio-secondary"
                disabled={!upcomingDates.length}
                onClick={exportCalendar}
              >
                <Download size={15} />
                Download practice calendar
              </button>
              {!upcomingDates.length && (
                <p role="status">
                  No future practice dates before this interview. Change or
                  clear the date to make a new plan.
                </p>
              )}
              <p className="studio-small">
                Calendar file only. No reminders are sent by intrvue and no
                calendar account is connected.
              </p>
            </details>
            <div className="studio-section-heading">
              <div>
                <span className="studio-eyebrow">UP NEXT</span>
                <h2>Your practice queue</h2>
              </div>
              <button
                className="studio-quiet"
                onClick={() => setTab("library")}
              >
                All {bank.length} prompts <ArrowRight size={16} />
              </button>
            </div>
            <div className="studio-queue">
              {queue
                .slice(0, Math.max(1, profile.goal.minutes / 5))
                .map((item, i) => (
                  <button
                    key={item.question.id}
                    onClick={() => start(item.question.id)}
                  >
                    <span className="studio-queue-number">0{i + 1}</span>
                    <span>
                      <small>
                        {item.reason} · {TOPICS[item.question.topic]}
                      </small>
                      <b>{item.question.title}</b>
                    </span>
                    <ArrowRight size={18} />
                  </button>
                ))}
              {!queue.length && (
                <p className="studio-muted">
                  Nothing due in this focus today. Your saved reflections are
                  ready when you need them.
                </p>
              )}
            </div>
            <div className="studio-school-note">
              <Target size={21} />
              <div>
                <h3>{schoolNotes[profile.goal.school].name} preparation</h3>
                <p>{schoolNotes[profile.goal.school].text}</p>
              </div>
            </div>
          </>
        )}
        {tab === "library" && (
          <>
            <div className="studio-section-heading">
              <div>
                <span className="studio-eyebrow">
                  ORIGINAL PRACTICE PROMPTS
                </span>
                <h2>Follow your curiosity.</h2>
              </div>
              <span className="studio-tag">{filtered.length} QUESTIONS</span>
            </div>
            <div className="studio-filters">
              <label className="studio-search">
                <Search size={17} />
                <input
                  aria-label="Search practice questions"
                  placeholder="Search a question or skill…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>
              <select
                aria-label="Filter by topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              >
                <option value="all">Every skill</option>
                {Object.entries(TOPICS).map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
              <select
                aria-label="Filter by difficulty"
                value={level}
                onChange={(e) => setLevel(e.target.value)}
              >
                <option value="all">Every level</option>
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    Level {n}
                  </option>
                ))}
              </select>
              <button
                className="studio-chip"
                aria-pressed={onlyBookmarks}
                onClick={() => setOnlyBookmarks((v) => !v)}
              >
                <Bookmark size={15} />
                Saved
              </button>
            </div>
            <div className="studio-library">
              {filtered.map((q) => (
                <article className="studio-card" key={q.id}>
                  <div className="studio-inline studio-between">
                    <span className="studio-eyebrow">{TOPICS[q.topic]}</span>
                    <button
                      className="studio-icon"
                      aria-label={`${profile.bookmarks.includes(q.id) ? "Unsave" : "Save"} ${q.title}`}
                      aria-pressed={profile.bookmarks.includes(q.id)}
                      onClick={() => bookmark(q.id)}
                    >
                      <Bookmark
                        size={17}
                        fill={
                          profile.bookmarks.includes(q.id)
                            ? "currentColor"
                            : "none"
                        }
                      />
                    </button>
                  </div>
                  <h3>{q.title}</h3>
                  <p>
                    Level {q.difficulty} · {q.liveProbes?.length ?? 0} follow-up
                    {q.liveProbes?.length === 1 ? "" : "s"}
                  </p>
                  <div className="studio-inline studio-between">
                    <span className="studio-small">
                      {latest.has(q.id)
                        ? Date.parse(latest.get(q.id)!.revisitAt) <= Date.now()
                          ? "Ready to revisit"
                          : "Tried before"
                        : "Untried"}
                    </span>
                    <button
                      className="studio-quiet"
                      onClick={() => start(q.id)}
                    >
                      Practise <ArrowRight size={15} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
            {!filtered.length && (
              <div className="studio-empty">
                <Search size={28} />
                <h3>No questions in this view.</h3>
                <p>
                  Try another skill, clear your search or turn off the saved
                  filter.
                </p>
                <button
                  className="studio-secondary"
                  onClick={() => {
                    setQuery("");
                    setTopic("all");
                    setLevel("all");
                    setOnlyBookmarks(false);
                  }}
                >
                  Reset filters
                </button>
              </div>
            )}
          </>
        )}
        {tab === "stories" && (
          <ExperienceJournal
            experiences={profile.experiences}
            onChange={(fn) =>
              update((old) => ({ ...old, experiences: fn(old.experiences) }))
            }
            onExport={() => downloadProfile(profile)}
            onPractise={(skill) => {
              setTopic(skill);
              setQuery("");
              setLevel("all");
              setOnlyBookmarks(false);
              setTab("library");
            }}
          />
        )}
        {tab === "history" && (
          <>
            <div className="studio-section-heading">
              <div>
                <span className="studio-eyebrow">YOUR THINKING, OVER TIME</span>
                <h2>Keep the useful part.</h2>
              </div>
              <button
                className="studio-secondary"
                disabled={
                  !profile.attempts.length && !profile.experiences.length
                }
                onClick={() => downloadProfile(profile)}
              >
                <Download size={16} />
                Export reflections
              </button>
            </div>
            {!profile.attempts.length ? (
              <div className="studio-empty">
                <CalendarDays size={30} />
                <h3>Your first reflection starts here.</h3>
                <p>
                  Complete a practice question and save one thing you want to
                  improve.
                </p>
                <button
                  className="studio-button"
                  onClick={() => setTab("plan")}
                >
                  Find my first question <ArrowRight size={16} />
                </button>
              </div>
            ) : (
              <div className="studio-history">
                {[...profile.attempts].reverse().map((a) => {
                  const q = bank.find((q) => q.id === a.questionId);
                  return (
                    <article className="studio-card" key={a.id}>
                      <div className="studio-inline studio-between">
                        <span className="studio-eyebrow">
                          {new Date(a.completedAt).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                          })}{" "}
                          · SELF REFLECTION
                        </span>
                        <span className="studio-tag">
                          {CONFIDENCE[a.confidence - 1]}
                        </span>
                      </div>
                      <h3>{q?.title ?? "Previous practice prompt"}</h3>
                      <p className="studio-next-step">
                        <b>Next time</b> {a.nextStep}
                      </p>
                      <details className="studio-details">
                        <summary>Read my reflection</summary>
                        {a.answer && (
                          <>
                            <h4>My answer</h4>
                            <p className="studio-preserve">{a.answer}</p>
                          </>
                        )}
                        {a.reflection && (
                          <>
                            <h4>What I noticed</h4>
                            <p className="studio-preserve">{a.reflection}</p>
                          </>
                        )}
                        <p>
                          Revisit from{" "}
                          {new Date(a.revisitAt).toLocaleDateString("en-GB")}.
                          Confidence is self-reported.
                        </p>
                      </details>
                      {q && (
                        <button
                          className="studio-quiet"
                          onClick={() => start(q.id)}
                        >
                          Try this again <ArrowRight size={15} />
                        </button>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
            <div className="studio-data-controls">
              <PracticeImport scope={scope} update={update} />
              <p>
                Up to 100 reflections stay in this browser under this profile.
                They are not synced to your account. Export them before clearing
                browser data.
              </p>
              <button
                className="studio-quiet"
                onClick={() => setClearing((v) => !v)}
              >
                Clear my studio data
              </button>
              {clearing && (
                <div className="studio-notice">
                  <p>
                    Remove this profile’s reflections, experiences, saved
                    questions and plan from this browser?
                  </p>
                  <div className="studio-inline">
                    <button
                      className="studio-secondary"
                      onClick={() => setClearing(false)}
                    >
                      Keep my data
                    </button>
                    <button
                      className="studio-secondary"
                      onClick={() => {
                        update(() => emptyProfile());
                        setClearing(false);
                      }}
                    >
                      Clear this profile
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </section>
      <footer className="studio-footer">
        <p>
          Solo practice uses existing discussion prompts. New school pilots and
          actor scenarios are reviewed separately. Your answers stay in this
          browser.
        </p>
        {onStartLive ? (
          <button className="studio-quiet" onClick={onStartLive}>
            Ready for a spoken circuit? <ArrowRight size={16} />
          </button>
        ) : (
          <a className="studio-quiet" href="/auth?mode=medicine">
            Explore live interview practice <ArrowRight size={16} />
          </a>
        )}
      </footer>
    </div>
  );
}
