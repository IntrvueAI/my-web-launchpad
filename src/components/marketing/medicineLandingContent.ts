import { INTERVIEW_TYPES, MEDICINE_LIVE_INTERVIEW_IDS } from "@/config/interviewTypes";
import { medicinePriceTag } from "@/config/medicinePricing";

/** Shared, verified landing copy: the live page and every preview mock read from here. */
export const MEDICINE_LANDING_FAQS: [string, string][] = [
  [
    "Can I try it without an account?",
    "Yes. The solo practice studio is free to open. Read a prompt, type or speak your answer, and save a self-reflection in your browser. Live AI interviews use a signed-in account. Ethics & judgement is free. Other mini interviews cost one Medicine credit (£6.99) and the full six-station MMI costs £34.99. The price is always shown before you start.",
  ],
  [
    "Is the practice studio a live AI interview?",
    "The solo studio uses original prompts, prewritten follow-ups and a review guide. You assess your own answer. Live spoken circuits with Clara are a separate experience that produces AI-generated written feedback.",
  ],
  [
    "Are these real university interview questions?",
    "No. The practice prompts are original material for transferable MMI skills. We offer one general MMI format and focused mini interviews. We are independent of the universities.",
  ],
  [
    "Which interview formats can I practise?",
    "Choose the full six-station MMI or a seven-minute mini interview in ethics, communication, motivation or data. Mini sessions include one minute to read and up to five minutes of discussion, with time for the introduction and close.",
  ],
  [
    "What happens to my recording?",
    "In the solo studio, microphone access starts only when you choose to record. Audio stays in your current tab and is removed when you leave the room. Download it if you want to keep it. Written reflections stay in this browser until you clear them; they do not sync between devices.",
  ],
  [
    "Does a practice score predict an offer?",
    "No. Self-reflections describe your own confidence; AI feedback supports practice. Neither is an admissions result, and universities make their own decisions.",
  ],
];

/** Live formats, timings and prices from the interview configuration — never hard-coded copy. */
export const MEDICINE_LANDING_FORMATS = MEDICINE_LIVE_INTERVIEW_IDS.map((id) => {
  const type = INTERVIEW_TYPES[id];
  const full = id === "medicine-mmi-practice";
  return {
    id,
    full,
    name: type.name.replace("Medicine MMI — ", ""),
    kind: full ? "Full MMI" : "7-minute mini interview",
    readingMinutes: (type.timingSeconds?.prep ?? 0) / 60,
    answerMinutes: (type.timingSeconds?.response ?? 0) / 60,
    price: medicinePriceTag(id) ?? "",
    href: `/?medicinePractice=${id}`,
  };
});
