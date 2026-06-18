import type { SubjectPack } from './types';
import { mathsPack } from './maths';
import { logicPack } from './logic';

/** Registry of available subject packs. Add verbal/current-affairs/general here as they land. */
const PACKS: Record<string, SubjectPack> = {
  maths: mathsPack,
  logic: logicPack,
};

export function getSubjectPack(subject: string): SubjectPack | undefined {
  return PACKS[subject];
}

export type { SubjectPack, TopicDef } from './types';
