import { useEffect, useState } from 'react';

export interface SchoolEntry {
  name: string;
  website?: string;
  region?: string;
  type?: string;
  gender?: string;
  notes?: string;
  admissionsUrl?: string;
  interview?: {
    registrationDeadline?: string;
    examDate?: string;
    interviewWindow?: string;
    notes?: string;
  };
  source?: string;
}

/**
 * Loads the UK schools list from the static JSON built by the research pass. Prefers the richer
 * interviews file (has admissions timing); falls back to the plain master list if that's all
 * that's been built so far. Shared by the school picker (onboarding + settings) and the admin
 * school finder — previously duplicated only in AdminSchoolFinder.tsx.
 */
export function useSchoolsData() {
  const [schools, setSchools] = useState<SchoolEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      for (const path of ['/data/uk-schools-interviews.json', '/data/uk-schools-master-list.json']) {
        try {
          const res = await fetch(path);
          if (!res.ok) continue;
          const data = await res.json();
          if (!cancelled && Array.isArray(data)) { setSchools(data); return; }
        } catch { /* try next path */ }
      }
      if (!cancelled) setError('No schools data file found yet.');
    })();
    return () => { cancelled = true; };
  }, []);

  return { schools, error };
}
