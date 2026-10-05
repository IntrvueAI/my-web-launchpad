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

/** Narrow repair intent. A request to restate the task is not an assessed answer. */
export function asksToClarifyTask(text: string): boolean {
  const clean = text.toLowerCase().replace(/[’]/g, "'").replace(/[?!.…,]/g, ' ').replace(/\s+/g, ' ').trim();
  return /^(?:(?:sorry|please|um|erm|wait)\s+)*(?:(?:what(?:'?s| is| was) (?:the |my )?(?:question|scenario|task|role))|(?:who am i(?: playing)?)|(?:who are you(?: playing)?)|(?:what am i (?:supposed|meant) to do)|(?:(?:can|could|would) you (?:please )?(?:repeat|rephrase|explain|clarify) (?:the |that |my )?(?:question|scenario|task|role|brief)(?: again)?)|(?:(?:repeat|rephrase|explain|clarify) (?:the |that |my )?(?:question|scenario|task|role|brief)(?: again)?)|(?:(?:can|could|would) you (?:please )?(?:repeat|rephrase) (?:that|it))|(?:say (?:that|it) again)|(?:i (?:don't|do not|didn't|did not) understand(?: (?:the |my )?(?:question|scenario|task|role))?))(?: please)?$/.test(clean);
}
