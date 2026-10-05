import { medicinePack } from "./pack.ts";
import type { SubjectPack } from "../types.ts";

/** Original short practice formats; school circuits keep their published timings. */
export const MEDICINE_PRACTICE_MODES = [
  {
    id: "medicine-ethics-practice",
    topic: "ethics-scenarios",
    label: "Ethics & judgement",
    description: "Weigh competing interests and explain a defensible decision.",
  },
  {
    id: "medicine-roleplay-practice",
    topic: "roleplay-stations",
    label: "Communication & empathy",
    description: "Listen, clarify a concern and respond to a live character.",
  },
  {
    id: "medicine-motivation-practice",
    topic: "motivation-reflection",
    label: "Motivation & reflection",
    description: "Turn one real experience into a specific, reflective answer.",
  },
  {
    id: "medicine-data-practice",
    topic: "data-interpretation",
    label: "Data & prioritisation",
    description:
      "Explain what the evidence supports and what remains uncertain.",
  },
] as const;
export type MedicinePracticeMode = (typeof MEDICINE_PRACTICE_MODES)[number];
export const PRACTICE_TIMING = { prep: 60, response: 300 };
export const PRACTICE_SESSION_MINUTES = 7;
/** General practice format, not a claim about any university's admissions circuit. */
export const FULL_MMI_MOCK = {
  id: "medicine-mmi-practice",
  stations: 6,
  timing: { prep: 60, response: 300 },
} as const;
export function packForFullMmiMock(): SubjectPack {
  return {
    ...medicinePack,
    mockTargetQuestions: FULL_MMI_MOCK.stations,
    stationReadingSeconds: FULL_MMI_MOCK.timing.prep,
    speakingNotes: `${medicinePack.speakingNotes}\nThis is a general six-station practice circuit, not an official university interview. Give the full candidate brief at each new station and connect transitions clearly. The interface provides one minute to read before five minutes of discussion.`,
  };
}
export function getMedicinePractice(
  id: string,
): MedicinePracticeMode | undefined {
  return MEDICINE_PRACTICE_MODES.find((mode) => mode.id === id);
}
export function packForMedicinePractice(
  mode: MedicinePracticeMode,
): SubjectPack {
  return {
    ...medicinePack,
    focusedPractice: true,
    stationReadingSeconds: PRACTICE_TIMING.prep,
    topics: medicinePack.topics.filter((topic) => topic.id === mode.topic),
    mockTargetQuestions: 1,
    maxStudentTurnsPerQuestion: 6,
    speakingNotes: `${medicinePack.speakingNotes}\nThis is ONE focused five-minute practice station. The opening already contains the scenario. Explore the answer with relevant follow-ups; finish after this station. Do not run a warm-up, start another station or switch topics.`,
    scoringPhilosophy: `${medicinePack.scoringPhilosophy}\nThis is a single short station. Assess only the evidence demonstrated here; explicitly describe unobserved areas as not assessed. Never invent performance from other stations.`,
  };
}
