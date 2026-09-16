import { useEffect, useRef, useState } from "react";
import { Upload } from "lucide-react";
import {
  mergeProfiles,
  parseProfile,
  profileSchema,
  type PracticeProfile,
} from "@/interview/studio/practice";

export default function PracticeImport({
  scope,
  update,
}: {
  scope: string;
  update: (fn: (old: PracticeProfile) => PracticeProfile) => void;
}) {
  const [pending, setPending] = useState<PracticeProfile | null>(null);
  const [restorePlan, setRestorePlan] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const request = useRef(0);
  useEffect(
    () => () => {
      request.current++;
    },
    [],
  );
  const [guest, setGuest] = useState(() => {
    if (scope === "guest" || scope === "design-preview") return null;
    try {
      const value = parseProfile(
        localStorage.getItem("intrvue:medicine-studio:v1:guest"),
      );
      return value.attempts.length ||
        value.experiences.length ||
        value.bookmarks.length
        ? value
        : null;
    } catch {
      return null;
    }
  });
  async function read(file: File | undefined) {
    if (!file) return;
    const ticket = ++request.current;
    setMessage("");
    setPending(null);
    setRestorePlan(false);
    if (file.size > 2 * 1024 * 1024) {
      setMessage(
        "This file is too large. Choose a studio export smaller than 2 MB.",
      );
      return;
    }
    setLoading(true);
    try {
      const text = await file.text();
      if (ticket !== request.current) return;
      const result = profileSchema.safeParse(JSON.parse(text));
      if (!result.success) throw new Error("invalid");
      setPending(result.data);
    } catch {
      if (ticket === request.current)
        setMessage(
          "This does not look like a valid practice studio export. Your existing notes are unchanged.",
        );
    } finally {
      if (ticket === request.current) setLoading(false);
    }
  }
  return (
    <div className="studio-import">
      <h3>Bring your notes with you.</h3>
      <p>
        Restore a studio export on this browser or account. It merges with your
        existing notes; repeated imports do not create duplicates.
      </p>
      <label className="studio-secondary studio-import-label">
        <Upload size={15} />
        {loading ? "Reading export…" : "Choose a studio export"}
        <input
          aria-label="Import practice export"
          type="file"
          accept="application/json,.json"
          disabled={loading}
          onChange={(e) => {
            void read(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </label>
      {guest && (
        <div className="studio-notice">
          <p>
            This browser also has guest practice notes. If they are yours, you
            can copy them into this profile.
          </p>
          <button
            className="studio-secondary"
            onClick={() => {
              setPending(guest);
              setRestorePlan(false);
            }}
          >
            Review my guest notes
          </button>
        </div>
      )}
      {pending && (
        <div className="studio-notice">
          <p>
            Ready to merge {pending.attempts.length} reflections,{" "}
            {pending.experiences.length} experiences and{" "}
            {pending.bookmarks.length} saved questions. The newest 100
            reflections and 30 experiences are kept.
          </p>
          <label className="studio-checkbox">
            <input
              type="checkbox"
              checked={restorePlan}
              onChange={(e) => setRestorePlan(e.target.checked)}
            />
            Also restore the practice plan from this export.
          </label>
          <div className="studio-inline studio-wrap">
            <button
              className="studio-button"
              onClick={() => {
                update((old) => mergeProfiles(old, pending, restorePlan));
                setPending(null);
                setGuest(null);
                setMessage(
                  "Your notes have been merged into this browser profile.",
                );
              }}
            >
              Merge these notes
            </button>
            <button
              className="studio-secondary"
              onClick={() => setPending(null)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      {message && (
        <p role="status" className="studio-notice">
          {message}
        </p>
      )}
    </div>
  );
}
