/**
 * Headless playthrough of the interview brain — no Anam, no Supabase, no API key.
 * Proves question selection, skip tracking, hint/retry, adapt and the evidence log end to end.
 *   npx tsx scripts/demo-interview.mts
 */
import { readFileSync } from 'node:fs';
import { advance, initState, type AdvanceDeps } from '../src/interview/engine/loop.ts';
import { mathsPack } from '../src/interview/subjects/maths/pack.ts';
import type { SessionState } from '../src/interview/engine/types.ts';

const bank = JSON.parse(
  readFileSync(new URL('../supabase/functions/interview-brain/_shared/maths-bank.json', import.meta.url), 'utf8'),
);
const deps: AdvanceDeps = { bank, pack: mathsPack }; // no llm → deterministic heuristic judge

let state: SessionState = initState({ subject: 'maths', mode: 'mock', pack: mathsPack, seed: 42 });
const log = (who: string, text: string) => text && console.log(`  ${who}: ${text}`);

async function turn(action: any, studentText?: string, mode?: any) {
  if (studentText) log('STUDENT', studentText);
  const r = await advance(state, { action, studentText, mode }, deps);
  state = r.state;
  log('CLARA', r.say);
  if (r.done) console.log('  [interview complete]');
  return r;
}

console.log('\n=== Maths Mock — headless playthrough (heuristic judge) ===\n');
await turn('start', undefined, 'mock');                       // greeting + opener
await turn('answer', 'I really like number puzzles');         // opener reply → Q1
// Answer Q1 correctly with working:
await turn('answer', `the answer is ${state.currentQuestion!.answer} because I worked through each step`);
// Skip the next question:
console.log('  STUDENT: [presses Skip]');
await turn('skip');
// Get one wrong, take the hint, then retry:
await turn('answer', 'um I think it is one hundred');         // wrong → hint
await turn('answer', 'maybe it is still not right');          // retry → moves on
// Answer the rest correctly to reach the wrap:
for (let i = 0; i < 10 && state.node !== 'done'; i++) {
  if (!state.currentQuestion) break;
  const r = await turn('answer', `it is ${state.currentQuestion.answer}, I calculated it carefully step by step`);
  if (r.done) break;
}

console.log('\n=== Evidence log (what the review is built from) ===');
for (const e of state.evidence) {
  console.log(
    `  Q${e.index} [${e.topic}/${e.difficulty}] ${e.skipped ? 'SKIPPED' : e.outcome} — "${e.studentAnswer.slice(0, 50)}"`,
  );
}
console.log(`\n  total questions: ${state.evidence.length}, skipped: ${state.evidence.filter((e) => e.skipped).length}\n`);
