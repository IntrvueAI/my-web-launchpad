import { useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Download,
  Pencil,
  Plus,
  Save,
} from "lucide-react";
import type { PracticeExperience } from "@/interview/studio/practice";

const skills = {
  reflection: "Reflection",
  teamwork: "Teamwork",
  communication: "Communication",
  judgement: "Judgement",
};
const focus = {
  reflection: "motivation-reflection",
  teamwork: "teamwork-resilience-judgement",
  communication: "motivation-reflection",
  judgement: "ethics-professionalism",
};
const fields = [
  {
    key: "situation",
    label: "What happened?",
    prompt:
      "Give just enough context. This can be school, work, volunteering, caring or everyday life.",
  },
  {
    key: "action",
    label: "What did you do?",
    prompt:
      "Explain your own role and why you chose that action. Use “I” when describing your contribution.",
  },
  {
    key: "outcome",
    label: "What changed?",
    prompt:
      "Describe what you observed, including an outcome you could not control or something that did not work.",
  },
  {
    key: "learning",
    label: "What did it teach you?",
    prompt:
      "What would you do differently now? How might this learning help you work with others in medicine?",
  },
] as const;
export default function ExperienceJournal({
  experiences,
  onChange,
  onPractise,
  onExport,
}: {
  experiences: PracticeExperience[];
  onChange: (fn: (old: PracticeExperience[]) => PracticeExperience[]) => void;
  onPractise: (topic: string) => void;
  onExport: () => void;
}) {
  const [editing, setEditing] = useState<PracticeExperience | null>(null);
  const [remove, setRemove] = useState("");
  const [discarding, setDiscarding] = useState(false);
  const [notice, setNotice] = useState("");
  function create() {
    setNotice("");
    setEditing({
      id: crypto.randomUUID(),
      title: "",
      skill: "reflection",
      situation: "",
      action: "",
      outcome: "",
      learning: "",
      updatedAt: new Date().toISOString(),
    });
  }
  function save() {
    if (
      !editing?.title.trim() ||
      !editing.action.trim() ||
      !editing.learning.trim()
    )
      return;
    const story = {
      ...editing,
      title: editing.title.trim(),
      updatedAt: new Date().toISOString(),
    };
    onChange((old) =>
      [...old.filter((e) => e.id !== story.id), story].slice(-30),
    );
    setEditing(null);
    setNotice(
      "Experience saved. Use it as a reminder, then practise explaining it naturally.",
    );
  }
  if (editing)
    return (
      <div className="studio-experience-editor">
        <div className="studio-section-heading">
          <div>
            <span className="studio-eyebrow">YOUR EXPERIENCE, YOUR WORDS</span>
            <h2>Find the useful example.</h2>
          </div>
          <button className="studio-quiet" onClick={() => setDiscarding(true)}>
            Back to my story bank
          </button>
        </div>
        <p className="studio-muted">
          Specific, ordinary experiences can say a lot about how you think.
          Capture what you learned, without turning it into a script.
        </p>
        {discarding && (
          <div className="studio-notice">
            <p>Leave these unsaved edits?</p>
            <div className="studio-inline">
              <button
                className="studio-secondary"
                onClick={() => setDiscarding(false)}
              >
                Keep editing
              </button>
              <button
                className="studio-secondary"
                onClick={() => {
                  setEditing(null);
                  setDiscarding(false);
                }}
              >
                Discard edits
              </button>
            </div>
          </div>
        )}
        <div className="studio-experience-fields">
          <div>
            <label className="studio-field">
              Give this experience a name
              <input
                maxLength={120}
                value={editing.title}
                onChange={(e) =>
                  setEditing({ ...editing, title: e.target.value })
                }
                placeholder="For example: helping our group recover from a missed deadline"
              />
            </label>
            <label className="studio-field">
              Skill to reflect on
              <select
                value={editing.skill}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    skill: e.target.value as PracticeExperience["skill"],
                  })
                }
              >
                {Object.entries(skills).map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <aside className="studio-school-note">
            <BookOpen size={21} />
            <div>
              <h3>Keep it about your learning.</h3>
              <p>
                Leave out names or identifying details about patients and other
                people. Save what you observed, how you contributed and what
                changed your thinking.
              </p>
            </div>
          </aside>
        </div>
        <div className="studio-experience-fields">
          {fields.map((f) => (
            <label className="studio-field" key={f.key}>
              {f.label}
              {(f.key === "action" || f.key === "learning") && (
                <span className="studio-small">Required</span>
              )}
              <textarea
                rows={5}
                maxLength={1500}
                value={editing[f.key]}
                onChange={(e) =>
                  setEditing({ ...editing, [f.key]: e.target.value })
                }
                placeholder={f.prompt}
              />
            </label>
          ))}
        </div>
        <button
          className="studio-button"
          disabled={
            !editing.title.trim() ||
            !editing.action.trim() ||
            !editing.learning.trim()
          }
          onClick={save}
        >
          <Save size={16} />
          Save this experience
        </button>
        <p className="studio-small">
          Saved in this browser. You can edit, export or remove it.
        </p>
      </div>
    );
  return (
    <>
      <div className="studio-section-heading">
        <div>
          <span className="studio-eyebrow">BUILD YOUR OWN EXAMPLES</span>
          <h2>Stories only you can tell.</h2>
        </div>
        <div className="studio-inline studio-wrap">
          <button
            className="studio-secondary"
            disabled={!experiences.length}
            onClick={onExport}
          >
            <Download size={15} />
            Export my notes
          </button>
          <button
            className="studio-button"
            onClick={create}
            disabled={experiences.length >= 30}
          >
            <Plus size={16} />
            Add an experience
          </button>
        </div>
      </div>
      <p className="studio-muted">
        A personal bank of moments to think with. Describe what you did, what
        happened and what it taught you. Up to 30 experiences stay in this
        browser.
      </p>
      {notice && (
        <p className="studio-notice" role="status">
          {notice}
        </p>
      )}
      {!experiences.length ? (
        <div className="studio-empty">
          <BookOpen size={30} />
          <h3>You already have a place to start.</h3>
          <p>
            A disagreement you helped resolve. A time you asked for help.
            <br />
            Something you noticed while caring for someone. What did you learn?
          </p>
          <button className="studio-secondary" onClick={create}>
            Capture my first experience <ArrowRight size={15} />
          </button>
        </div>
      ) : (
        <div className="studio-experiences">
          {[...experiences]
            .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
            .map((e) => (
              <article className="studio-card" key={e.id}>
                <div className="studio-inline studio-between">
                  <span className="studio-tag">{skills[e.skill]}</span>
                  <span className="studio-small">
                    {new Date(e.updatedAt).toLocaleDateString("en-GB")}
                  </span>
                </div>
                <h3>{e.title}</h3>
                <p className="studio-experience-learning">{e.learning}</p>
                <details className="studio-details">
                  <summary>Read my example</summary>
                  {fields.map(
                    (f) =>
                      e[f.key] && (
                        <div key={f.key}>
                          <h4>{f.label}</h4>
                          <p className="studio-preserve">{e[f.key]}</p>
                        </div>
                      ),
                  )}
                </details>
                <div className="studio-inline studio-between">
                  <button
                    className="studio-quiet"
                    onClick={() => {
                      setEditing(e);
                      setNotice("");
                    }}
                  >
                    <Pencil size={15} />
                    Edit
                  </button>
                  <button
                    className="studio-quiet"
                    onClick={() => onPractise(focus[e.skill])}
                  >
                    Practise this skill <ArrowRight size={15} />
                  </button>
                </div>
                <button
                  className="studio-quiet studio-small"
                  onClick={() => setRemove(e.id)}
                >
                  Remove experience
                </button>
                {remove === e.id && (
                  <div className="studio-notice">
                    <p>Remove “{e.title}” from this browser?</p>
                    <div className="studio-inline">
                      <button
                        className="studio-secondary"
                        onClick={() => setRemove("")}
                      >
                        Keep
                      </button>
                      <button
                        className="studio-secondary"
                        onClick={() => {
                          onChange((old) => old.filter((s) => s.id !== e.id));
                          setRemove("");
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                )}
              </article>
            ))}
        </div>
      )}
    </>
  );
}
