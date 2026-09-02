#!/usr/bin/env node
/**
 * One-off conversion: turn the 20 fully-specified personas in
 * src/interview/medicine-content/data/roleplays.json into live BankQuestion entries
 * (format: 'RP', roleplay: {...}) for src/interview/bank/questions/medicine/roleplay-stations/.
 * Run once; re-run only if roleplays.json changes and the bank needs regenerating.
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(root, 'src/interview/medicine-content/data/roleplays.json');
const outDir = path.join(root, 'src/interview/bank/questions/medicine/roleplay-stations');

const bandToDifficulty = { '2_standard': 2, '3_stretch': 3, '4_adversarial': 4 };

function summarizeStrong(rp) {
  return rp.desired_outcomes.join('; ') + '.';
}
function summarizeDeveloping(rp) {
  return `Meets some but not all of: ${rp.desired_outcomes.join('; ')}. Actor response when this happens: ${rp.actor_response_to_weak}`;
}
function summarizeWeak(rp) {
  const flags = rp.red_flags.length ? ` Red flags for this station: ${rp.red_flags.join('; ')}.` : '';
  return `Fails most of the desired outcomes, or triggers an escalation (${rp.escalation_triggers.slice(0, 2).join('; ')}).${flags}`;
}

async function main() {
  const raw = JSON.parse(await fs.readFile(src, 'utf8'));
  const byDifficulty = new Map();
  for (const rp of raw.roleplays) {
    const difficulty = bandToDifficulty[rp.band] ?? 3;
    const entry = {
      id: `MED-${rp.id}`,
      subject: 'medicine',
      topic: 'roleplay-stations',
      difficulty,
      questionType: 'Live Roleplay',
      title: rp.title,
      tags: ['roleplay', ...rp.taxonomy, rp.context.toLowerCase()],
      format: 'RP',
      question: rp.opening_statement,
      answer: `N/A — roleplay station. Scored on the live interaction (S1 content, S2 communication, S5 empathy, S6 professional judgement) and which of the ${rp.endings.length} endings is reached, never on a single "correct" line. Central test: ${rp.desired_outcomes[0]}`,
      modelReasoningPath: `Persona: ${rp.actor.name}, ${rp.actor.role} (${rp.actor.age}). Applicant role: ${rp.applicant_role} Starting state: ${rp.actor_state.initial} Trajectory: ${rp.actor_state.trajectory}`,
      rubric: {
        strong: summarizeStrong(rp),
        developing: summarizeDeveloping(rp),
        weak: summarizeWeak(rp),
      },
      commonMistakes: rp.red_flags.map((flag) => ({
        mistake: flag,
        reveals: 'A red flag for this station — reported explicitly in feedback regardless of the overall score, never averaged away.',
      })),
      liveProbes: [],
      hints: [],
      roleplay: {
        name: rp.actor.name,
        role: `${rp.actor.role} (${rp.actor.age})`,
        applicantRole: rp.applicant_role,
        openingStatement: rp.opening_statement,
        actorStateInitial: rp.actor_state.initial,
        actorStateTrajectory: rp.actor_state.trajectory,
        hiddenFacts: rp.hidden_facts.map((f) => ({ fact: f.fact, disclosureCondition: f.disclosure_condition })),
        escalationTriggers: rp.escalation_triggers,
        deEscalationTriggers: rp.de_escalation_triggers,
        resistancePatterns: rp.resistance_patterns,
        interruptionRule: rp.interruption_rule,
        plantedMisunderstanding: rp.planted_misunderstanding,
        desiredOutcomes: rp.desired_outcomes,
        endings: rp.endings,
        redFlags: rp.red_flags,
        actorResponseToStrong: rp.actor_response_to_strong,
        actorResponseToWeak: rp.actor_response_to_weak,
      },
    };
    if (!byDifficulty.has(difficulty)) byDifficulty.set(difficulty, []);
    byDifficulty.get(difficulty).push(entry);
  }
  await fs.mkdir(outDir, { recursive: true });
  for (const [difficulty, entries] of byDifficulty) {
    const file = path.join(outDir, `${difficulty}.json`);
    await fs.writeFile(file, JSON.stringify(entries, null, 2) + '\n');
    console.log(`wrote ${entries.length} entries to ${path.relative(root, file)}`);
  }
}

main();
