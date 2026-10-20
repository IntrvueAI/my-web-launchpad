import type { BankQuestion } from './types';

/** Candidate-facing context only. Actor instructions and marking guidance stay private. */
export function publicQuestionPrompt(question: BankQuestion): string {
  if (!question.roleplay) return question.question;
  const rp = question.roleplay;
  return `Your role and situation\n${rp.applicantRole}\n\nYou are speaking to ${rp.name}, ${rp.role}.\n\nYour task\nSpeak directly to ${rp.name} and respond to their concerns within your role.\n\nTheir opening words\n${rp.openingStatement}`;
}

/** Spoken counterpart of the brief: switch from examiner to actor explicitly. */
export function spokenTaskBrief(question: BankQuestion): string {
  if (!question.roleplay) return question.question;
  const rp = question.roleplay;
  return `This is a roleplay. ${rp.applicantRole} I will play ${rp.name}, ${rp.role}. Speak directly to me as that person.`;
}
export function spokenQuestionPrompt(question: BankQuestion, reading = false): string {
  const brief = spokenTaskBrief(question);
  return question.roleplay ? `${brief} ${reading ? 'Their opening words are:' : 'The roleplay starts now.'} ${question.roleplay.openingStatement}` : brief;
}

/** "Say that again" refers to the last thing said, not necessarily the task brief. */
export function asksToRepeatLastLine(text: string): boolean {
  const clean = text.toLowerCase().replace(/[’]/g, "'").replace(/[?!.…,]/g, ' ').replace(/\s+/g, ' ').trim();
  return /^(?:(?:sorry|please|um|erm|wait)\s+)*(?:(?:(?:can|could|would) you (?:please )?(?:(?:repeat|rephrase) (?:that|it)|say (?:that|it) again))|(?:say (?:that|it) again))(?: please)?$/.test(clean);
}

/** "Can you repeat the question?" — for 11+ this repeats Clara's last line rather than a brief. */
export function asksToRepeatQuestion(text: string): boolean {
  const clean = text.toLowerCase().replace(/[’]/g, "'").replace(/[?!.…,]/g, ' ').replace(/\s+/g, ' ').trim();
  return /^(?:(?:sorry|please|um|erm|wait)\s+)*(?:(?:can|could|would) you (?:please )?)?(?:repeat|say|read) (?:the|that) question(?: again)?(?: please)?$/.test(clean);
}

/** Narrow repair intent. A request to restate the task is not an assessed answer. */
export function asksToClarifyTask(text: string): boolean {
  const clean = text.toLowerCase().replace(/[’]/g, "'").replace(/[?!.…,]/g, ' ').replace(/\s+/g, ' ').trim();
  return /^(?:(?:sorry|please|um|erm|wait)\s+)*(?:(?:what(?:'?s| is| was) (?:the |my )?(?:question|scenario|task|role))|(?:who am i(?: playing)?)|(?:who are you(?: playing)?)|(?:what am i (?:supposed|meant) to do)|(?:(?:can|could|would) you (?:please )?(?:repeat|rephrase|explain|clarify) (?:the |that |my )?(?:question|scenario|task|role|brief)(?: again)?)|(?:(?:repeat|rephrase|explain|clarify) (?:the |that |my )?(?:question|scenario|task|role|brief)(?: again)?)|(?:(?:can|could|would) you (?:please )?(?:repeat|rephrase) (?:that|it))|(?:say (?:that|it) again)|(?:i (?:don't|do not|didn't|did not) understand(?: (?:the |my )?(?:question|scenario|task|role))?))(?: please)?$/.test(clean);
}

/** A speakable first name, or nothing. Profiles fall back to the email's local part
 *  ("founders", "Intrvue.ai"), which must never be read aloud as a name. */
export function firstNameFrom(
  fullName: string | null | undefined,
  email?: string | null,
): string | undefined {
  const first = (fullName || "").trim().split(/\s+/)[0] || "";
  const local = (email || "").split("@")[0].toLowerCase();
  if (!/^\p{L}[\p{L}'’-]{0,29}$/u.test(first)) return undefined;
  if (local && (fullName || "").trim().toLowerCase() === local) return undefined;
  return first.charAt(0).toUpperCase() + first.slice(1);
}
