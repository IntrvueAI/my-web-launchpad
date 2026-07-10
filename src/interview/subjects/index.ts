import type { SubjectPack } from './types';
import { mathsPack } from './maths';
import { logicPack } from './logic';
import { currentaffairsPack } from './currentaffairs';
import { elevenplusPack } from './elevenplus';

/** Registry of available subject packs. Add verbal/general here as they land. */
const PACKS: Record<string, SubjectPack> = {
  maths: mathsPack,
  logic: logicPack,
  currentaffairs: currentaffairsPack,
  elevenplus: elevenplusPack,
};

export function getSubjectPack(subject: string): SubjectPack | undefined {
  return PACKS[subject];
}

export type { SubjectPack, TopicDef } from './types';
