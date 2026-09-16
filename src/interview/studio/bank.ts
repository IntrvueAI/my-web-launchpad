import type { BankQuestion } from "../engine/types";
import { eligibleQuestions } from "./practice";

// Medicine only: the public studio must not eagerly pull every interview subject into its chunk.
const modules = import.meta.glob<{ default: BankQuestion[] }>(
  [
    "../bank/questions/medicine/motivation-reflection/*.json",
    "../bank/questions/medicine/teamwork-resilience-judgement/*.json",
    "../bank/questions/medicine/ethics-professionalism/*.json",
    "../bank/questions/medicine/ethics-scenarios/*.json",
    "../bank/questions/medicine/data-interpretation/*.json",
  ],
  { eager: true },
);

// An explicit editorial subset: no clinical triage, prescribing, prognosis or emergency actions.
// A missing clinicalReviewRequired flag alone is not sufficient for solo publication.
export const SOLO_PROMPT_IDS = new Set([
  "MED-D2",
  "MED-D3",
  "MED-D4",
  "MED-D5",
  "MED-D6",
  "MED-D7",
  "MED-D8",
  "MED-D9",
  "MED-D11",
  "MED-D12",
  "MED-EP-10",
  "MED-EP-11",
  "MED-EP-12",
  "MED-EP-02",
  "MED-EP-05",
  "MED-EP-06",
  "MED-EP-07",
  "MED-EP-16",
  "MED-EP-17",
  "MED-EP-18",
  "MED-E5",
  "MED-E9",
  "MED-E12",
  "MED-E13",
  "MED-E14",
  "MED-MR-18",
  "MED-M1",
  "MED-M2",
  "MED-M3",
  "MED-M4",
  "MED-M5",
  "MED-M6",
  "MED-M7",
  "MED-M8",
  "MED-M9",
  "MED-MR-11",
  "MED-MR-13",
  "MED-MR-14",
  "MED-MR-15",
  "MED-MR-16",
  "MED-MR-17",
  "MED-TRJ-01",
  "MED-TRJ-02",
  "MED-TRJ-03",
  "MED-TRJ-04",
  "MED-TRJ-05",
  "MED-TRJ-06",
  "MED-TRJ-08",
]);
export function getStudioBank(now = Date.now()): BankQuestion[] {
  return eligibleQuestions(
    Object.values(modules)
      .flatMap((m) => m.default)
      .filter((q) => SOLO_PROMPT_IDS.has(q.id)),
    now,
  );
}
