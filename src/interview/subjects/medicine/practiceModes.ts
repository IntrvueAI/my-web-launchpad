import { medicinePack } from "./pack";
import type { SubjectPack } from "../types";

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
export const PRACTICE_TIMING = { prep: 30, response: 300 };
export const PRACTICE_SESSION_MINUTES = 7;
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
    topics: medicinePack.topics.filter((topic) => topic.id === mode.topic),
    mockTargetQuestions: 1,
    maxStudentTurnsPerQuestion: 6,
    speakingNotes: `${medicinePack.speakingNotes}\nThis is ONE focused five-minute practice station. The opening already contains the scenario. Explore the answer with relevant follow-ups; finish after this station. Do not run a warm-up, start another station or switch topics.`,
    scoringPhilosophy: `${medicinePack.scoringPhilosophy}\nThis is a single short station. Assess only the evidence demonstrated here; explicitly describe unobserved areas as not assessed. Never invent performance from other stations.`,
  };
}
