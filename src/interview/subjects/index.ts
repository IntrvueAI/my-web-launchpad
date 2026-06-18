import type { SubjectPack } from './types';
import { mathsPack } from './maths';

/** Registry of available subject packs. Add logic/verbal/current-affairs/general here as they land. */
const PACKS: Record<string, SubjectPack> = {
  maths: mathsPack,
};

export function getSubjectPack(subject: string): SubjectPack | undefined {
  return PACKS[subject];
}

export type { SubjectPack, TopicDef } from './types';
