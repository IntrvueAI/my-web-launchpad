import { lazy, Suspense, useState } from "react";
import { INTERVIEW_TYPES, InterviewType } from "@/config/interviewTypes";
import { listOntologyDomains } from "@/interview/medicine-content";

interface Props {
  onStartInterview: (type: InterviewType) => void;
  scope?: string;
}

const MedicineStudio = lazy(
  () => import("@/components/medicine-studio/MedicineStudio"),
);

const CIRCUITS = [
  INTERVIEW_TYPES["medicine-mmi"],
  INTERVIEW_TYPES["medicine-mmi-manchester"],
];

export function MedicinePractice({
  onStartInterview,
  scope = "design-preview",
}: Props) {
  const [practiceMode, setPracticeMode] = useState<"solo" | "live">("solo");
  const [showBank, setShowBank] = useState(false);
  const domains = listOntologyDomains();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "flex", gap: 12 }} aria-label="Practice type">
        <button
          style={{
            ...primaryBtn,
            background:
              practiceMode === "solo" ? "var(--med-action)" : "var(--med-card)",
            color:
              practiceMode === "solo" ? "white" : "var(--med-primary-dark)",
          }}
          aria-pressed={practiceMode === "solo"}
          onClick={() => setPracticeMode("solo")}
        >
          Solo practice studio
        </button>
        <button
          style={{
            ...primaryBtn,
            background:
              practiceMode === "live" ? "var(--med-action)" : "var(--med-card)",
            color:
              practiceMode === "live" ? "white" : "var(--med-primary-dark)",
          }}
          aria-pressed={practiceMode === "live"}
          onClick={() => setPracticeMode("live")}
        >
          Live AI circuits
        </button>
      </div>
      {practiceMode === "solo" ? (
        <Suspense fallback={<p>Opening your practice desk…</p>}>
          <MedicineStudio
            key={scope}
            scope={scope}
            compact
            onStartLive={() => setPracticeMode("live")}
          />
        </Suspense>
      ) : (
        <>
          <div>
            <h1
              style={{
                fontFamily: "var(--med-display)",
                fontWeight: 700,
                fontSize: 30,
                margin: 0,
              }}
            >
              Practice
            </h1>
            <p
              style={{ color: "var(--med-muted)", fontSize: 15, marginTop: 6 }}
            >
              Practise original questions with Clara in a circuit guided by
              published timings.
            </p>
          </div>

          <div className="med-grid-two">
            {CIRCUITS.map((type) => (
              <div key={type.id} style={cardStyle}>
                <h3
                  style={{
                    fontFamily: "var(--med-display)",
                    fontWeight: 700,
                    fontSize: 20,
                    margin: 0,
                  }}
                >
                  {type.name.replace("Medicine MMI — ", "")}
                </h3>
                <p
                  style={{
                    color: "var(--med-muted)",
                    fontSize: 14.5,
                    lineHeight: 1.6,
                    marginTop: 10,
                  }}
                >
                  {type.description}
                </p>
                <div
                  style={{
                    display: "flex",
                    gap: 16,
                    marginTop: 16,
                    fontSize: 13,
                    color: "var(--med-tertiary)",
                  }}
                >
                  <span>
                    {type.timingSeconds?.prep
                      ? `${type.timingSeconds.prep / 60} min prep`
                      : "No prep"}
                  </span>
                  <span>·</span>
                  <span>
                    {type.timingSeconds
                      ? `${type.timingSeconds.response / 60} min per station`
                      : ""}
                  </span>
                </div>
                <button
                  onClick={() => onStartInterview(type)}
                  style={{ ...primaryBtn, width: "100%", marginTop: 18 }}
                >
                  Start · {type.costCredits ?? 0} credits
                </button>
              </div>
            ))}
          </div>

          <div style={cardStyle}>
            <button
              onClick={() => setShowBank((v) => !v)}
              style={{
                display: "flex",
                justifyContent: "space-between",
                width: "100%",
                background: "none",
                border: 0,
                cursor: "pointer",
                fontFamily: "inherit",
                padding: 0,
              }}
            >
              <h3
                style={{
                  fontFamily: "var(--med-display)",
                  fontWeight: 700,
                  fontSize: 17,
                  margin: 0,
                }}
              >
                Skills in the practice bank
              </h3>
              <span
                style={{
                  color: "var(--med-primary-dark)",
                  fontWeight: 600,
                  fontSize: 13.5,
                }}
              >
                {showBank ? "Hide" : "Browse"} →
              </span>
            </button>
            {showBank && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: 14,
                  marginTop: 18,
                }}
              >
                {domains.map((d) => (
                  <div
                    key={d.id}
                    style={{
                      background: "var(--med-bg)",
                      borderRadius: 12,
                      padding: 16,
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: 14.5 }}>
                      {d.label}
                    </div>
                    <div
                      style={{
                        color: "var(--med-tertiary)",
                        fontSize: 13,
                        marginTop: 4,
                      }}
                    >
                      {d.subdomains.reduce((n, s) => n + s.topics.length, 0)}{" "}
                      topic
                      {d.subdomains.reduce((n, s) => n + s.topics.length, 0) ===
                      1
                        ? ""
                        : "s"}{" "}
                      across {d.subdomains.length} area
                      {d.subdomains.length === 1 ? "" : "s"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: "var(--med-card)",
  border: "1px solid var(--med-border)",
  borderRadius: 16,
  padding: "26px 28px",
  boxShadow: "var(--med-shadow-sm)",
};
const primaryBtn: React.CSSProperties = {
  background: "var(--med-action)",
  color: "var(--med-card)",
  border: 0,
  borderRadius: 12,
  padding: "14px 22px",
  fontWeight: 600,
  fontSize: 15,
  cursor: "pointer",
  minHeight: 48,
  boxShadow: "0 10px 26px -10px var(--med-primary-soft)",
};
