import {
  CIRCUIT_PROFILES,
  assembleCircuit,
  type CircuitProfile,
  type PracticeStation,
} from "../../medicine-content/expansion/circuit.ts";
import { initAgentState } from "../../engine/agent.ts";
import type { BankQuestion } from "../../engine/types.ts";
import type { SubjectPack } from "../types.ts";
import { medicinePack } from "./pack.ts";

export interface MedicinePilot {
  interviewTypeId: string;
  school: string;
  style: "academic" | "mmi";
  circuit: CircuitProfile;
  sourceUrl: string;
  evidence: string;
  behaviours: string[];
}
export const MEDICINE_PILOTS: MedicinePilot[] = [
  {
    interviewTypeId: "medicine-oxford-pilot",
    school: "Oxford",
    style: "academic",
    circuit: CIRCUIT_PROFILES[0],
    sourceUrl:
      "https://www.medsci.ox.ac.uk/study/medicine/pre-clinical/applying/application-process",
    evidence:
      "Applicants meet two colleges; interview structure can vary. Our four exercises are an original practice design.",
    behaviours: [
      "Ask for assumptions before a conclusion.",
      "Probe the scientific mechanism, then test its limits.",
      "Invite a revised explanation when the evidence changes.",
    ],
  },
  {
    interviewTypeId: "medicine-cambridge-pilot",
    school: "Cambridge",
    style: "academic",
    circuit: CIRCUIT_PROFILES[1],
    sourceUrl:
      "https://www.undergraduate.study.cam.ac.uk/sites/default/files/publications/key_criteria_for_medical_admissions.pdf",
    evidence:
      "Selection criteria include applying science to unfamiliar situations, forming hypotheses and adapting explanations. College invitations determine logistics.",
    behaviours: [
      "Invite more than one plausible hypothesis.",
      "Ask which experiment would distinguish them.",
      "Probe uncertainty and willingness to revise an interpretation.",
    ],
  },
  {
    interviewTypeId: "medicine-imperial-pilot",
    school: "Imperial",
    style: "mmi",
    circuit: CIRCUIT_PROFILES[2],
    sourceUrl:
      "https://www.imperial.ac.uk/medicine/study/undergraduate/medicine-mbbs-programmes/mmi/",
    evidence:
      "Imperial publishes five-minute answers and separate content and communication marks. Six exercises and zero reading time here are practice choices.",
    behaviours: [
      "Seek a concrete example and what the candidate learned.",
      "Challenge a judgement fairly without requiring a preferred opinion.",
      "Assess the spoken content; do not infer facial expression or voice quality from text.",
    ],
  },
];

export const getMedicinePilot = (id: string) =>
  MEDICINE_PILOTS.find((p) => p.interviewTypeId === id);

/** Total application/provider cap. Includes an editorial 3-minute opening/closing allowance and
 * 15 seconds per station for transitions/network overhead, separate from the answer clock. */
export function sessionBudgetMinutes(
  stations: number,
  timing: { prep: number; response: number; transition?: number },
): number {
  return Math.ceil(
    (stations * (timing.prep + timing.response + 15) +
      Math.max(0, stations - 1) * (timing.transition ?? 0) +
      180) /
      60,
  );
}

export function packForMedicinePilot(pilot: MedicinePilot): SubjectPack {
  const academic = pilot.style === "academic";
  return {
    ...medicinePack,
    persona: `You are Clara, an AI medicine admissions practice interviewer. This is an original ${pilot.school} ${pilot.style} practice session, not an official university interview. Never claim university affiliation or personal clinical experience.`,
    speakingNotes: `${academic ? "Run a thoughtful academic conversation: reasoning aloud, scientific mechanisms, alternative explanations, assumptions and uncertainty. Do not demand specialist clinical knowledge. Let the candidate work before offering one small prompt. Keep disagreement exploratory rather than combative." : medicinePack.speakingNotes}\n${pilot.behaviours.join("\n")}\nUse authored probes one at a time and respond to the candidate's actual reasoning. A limit ends the exercise; it is not evidence of a weak answer.`,
    guardrails: `${medicinePack.guardrails}\nDo not ask the candidate to disclose a patient identity or personal trauma. Accept transferable examples from school, work, caring or volunteering; privileged work experience is not required. Use only the planned stations; no invented replacement exercises.`,
    openers: [
      `Welcome. We'll work through ${pilot.circuit.slots.length} ${pilot.style === "academic" ? "scientific reasoning and reflection exercises" : "short practice stations"}. Tell me briefly what you want to improve today.`,
    ],
    topics: [
      ...medicinePack.topics,
      {
        id: "scientific-reasoning",
        label: "Scientific reasoning",
        blurb: "Apply knowledge, test assumptions and revise explanations.",
      },
      {
        id: "teamwork-resilience-judgement",
        label: "Teamwork and judgement",
        blurb: "Concrete examples, responsibility and reflection.",
      },
    ],
    domains: academic
      ? [
          "Scientific Reasoning",
          "Evidence & Uncertainty",
          "Communication & Clarity",
          "Reflection & Adaptability",
        ]
      : medicinePack.domains,
    scoringPhilosophy: academic
      ? "Assess the reasoning demonstrated in the transcript: connect scientific principles to the unfamiliar problem, state assumptions, consider alternatives, and update in response to evidence. Credit useful questions and justified uncertainty. Distinguish an initial mistake that is revised from persistent unsupported certainty. Do not reward memorised clinical detail, prestigious experiences, a particular accent or confidence without reasoning. Unassessed or incomplete is not automatically weak. These are practice domains, not the university scoring rubric."
      : `${medicinePack.scoringPhilosophy}\nOur four-domain /20 practice feedback is not Imperial's official content/communication scoring system. Do not claim equivalence or predict admission.`,
    mockTargetQuestions: pilot.circuit.slots.length,
    maxStudentTurnsPerQuestion: academic ? 5 : 4,
  };
}

export type PilotQuestion = BankQuestion & PracticeStation & { status: string };
export function initialiseMedicinePilot(
  pilot: MedicinePilot,
  bank: PilotQuestion[],
  options: {
    seed: number;
    seenIds?: string[];
    studentName?: string;
    createdAt?: string;
  },
) {
  const eligible = bank.filter(
    (q) =>
      q.status === "draft" &&
      q.subject === "medicine" &&
      (!q.currentAffairsExpiry ||
        Date.parse(q.currentAffairsExpiry) > Date.now()),
  );
  const assembled = assembleCircuit(eligible, pilot.circuit, {
    ...options,
    maxDifficulty: 3,
  });
  if (assembled.ok === false) return assembled;
  const pack = packForMedicinePilot(pilot);
  const state = initAgentState({
    subject: "medicine",
    mode: "mock",
    pack,
    seed: options.seed,
    studentName: options.studentName,
  });
  state.questionPlan = {
    profileId: pilot.interviewTypeId,
    questionIds: assembled.plan.stations.map((s) => s.stationId),
    contentStatus: "draft",
  };
  return { ok: true as const, state, plan: assembled.plan, pack };
}
