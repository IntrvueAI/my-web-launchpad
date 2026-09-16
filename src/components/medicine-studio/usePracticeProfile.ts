import { useCallback, useEffect, useRef, useState } from "react";
import {
  emptyProfile,
  parseProfile,
  type PracticeProfile,
} from "@/interview/studio/practice";

export function usePracticeProfile(scope: string) {
  const key = `intrvue:medicine-studio:v1:${scope}`;
  const [error, setError] = useState("");
  const [profile, setProfile] = useState(() => {
    try {
      return parseProfile(localStorage.getItem(key));
    } catch {
      return emptyProfile();
    }
  });
  const current = useRef(profile);
  const unsaved = useRef(false);
  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key !== key || unsaved.current) return;
      current.current = parseProfile(event.newValue);
      setProfile(current.current);
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [key]);
  const update = useCallback(
    (fn: (old: PracticeProfile) => PracticeProfile) => {
      let base = current.current;
      if (!unsaved.current) {
        try {
          base = parseProfile(localStorage.getItem(key));
        } catch {
          /* Keep the in-memory copy. */
        }
      }
      const next = fn(base);
      current.current = next;
      setProfile(next);
      try {
        localStorage.setItem(key, JSON.stringify(next));
        unsaved.current = false;
        setError("");
      } catch {
        unsaved.current = true;
        setError(
          "This browser could not save your practice. Export it before leaving.",
        );
      }
    },
    [key],
  );
  return { profile, update, error };
}
