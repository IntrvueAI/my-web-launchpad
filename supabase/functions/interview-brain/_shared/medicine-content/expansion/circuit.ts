/** Admin rehearsal planning only. This module never feeds the live student interview engine. */
export interface PracticeStation { id: string; topic: string; difficulty: number; tracks: string[]; title: string; question: string; }
export interface CircuitProfile {
  id: string; name: string; track: string; responseSeconds: number; prepSeconds: number; transitionSeconds: number;
  timingBasis: string; slots: { label: string; topics: string[] }[];
}
export const CIRCUIT_PROFILES: CircuitProfile[] = [
  { id: 'oxford', name: 'Oxford academic practice', track: 'academic', responseSeconds: 480, prepSeconds: 0, transitionSeconds: 0,
    timingBasis: 'Four exercises of eight minutes are our practice design. Oxford college interview counts and timing vary.',
    slots: [{ label: 'Scientific reasoning', topics: ['scientific-reasoning'] }, { label: 'Interpreting evidence', topics: ['data-interpretation'] },
      { label: 'An unfamiliar problem', topics: ['scientific-reasoning'] }, { label: 'Motivation and reflection', topics: ['motivation-reflection'] }] },
  { id: 'cambridge', name: 'Cambridge academic practice', track: 'academic', responseSeconds: 480, prepSeconds: 0, transitionSeconds: 0,
    timingBasis: 'Four exercises of eight minutes are our practice design. The college invitation determines the real schedule.',
    slots: [{ label: 'Applying science', topics: ['scientific-reasoning'] }, { label: 'Testing an explanation', topics: ['scientific-reasoning'] },
      { label: 'Data and uncertainty', topics: ['data-interpretation'] }, { label: 'Reflecting on experience', topics: ['motivation-reflection'] }] },
  { id: 'imperial', name: 'Imperial MMI practice', track: 'mmi', responseSeconds: 300, prepSeconds: 0, transitionSeconds: 0,
    timingBasis: 'Five-minute answers are published by Imperial. This six-exercise mix and zero-reading-time setting are practice choices, not verified circuit logistics.',
    slots: [{ label: 'Motivation', topics: ['motivation-reflection'] }, { label: 'Teamwork', topics: ['teamwork-resilience-judgement'] },
      { label: 'Communication', topics: ['communication-tasks','roleplay-stations'] }, { label: 'Ethics', topics: ['ethics-scenarios','ethics-professionalism'] },
      { label: 'Data interpretation', topics: ['data-interpretation'] }, { label: 'Professional judgement', topics: ['ethics-professionalism','teamwork-resilience-judgement'] }] },
  { id: 'mixed-mmi', name: 'Mixed MMI practice', track: 'mmi', responseSeconds: 360, prepSeconds: 60, transitionSeconds: 0,
    timingBasis: 'Six exercises with one minute to read and six to respond: a practice design with no university-format claim.',
    slots: [{ label: 'Motivation', topics: ['motivation-reflection'] }, { label: 'Teamwork', topics: ['teamwork-resilience-judgement'] },
      { label: 'Communication', topics: ['communication-tasks','roleplay-stations'] }, { label: 'Ethics', topics: ['ethics-scenarios'] },
      { label: 'Data interpretation', topics: ['data-interpretation'] }, { label: 'Professionalism', topics: ['ethics-professionalism'] }] },
];
export interface CircuitPlan {
  id: string; createdAt: string; profileId: string; seed: number; contentStatus: 'draft';
  stations: { slot: string; stationId: string; title: string; prepSeconds: number; responseSeconds: number; transitionSeconds: number }[];
  totalSeconds: number; timingBasis: string;
}
export type AssemblyResult = { ok: true; plan: CircuitPlan } | { ok: false; shortages: string[] };
function random(seed: number) {
  let state = seed >>> 0;
  return () => { state += 0x6D2B79F5; let t = state; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export function assembleCircuit(bank: PracticeStation[], profile: CircuitProfile, options: { seed: number; seenIds?: string[]; maxDifficulty?: number; createdAt?: string }): AssemblyResult {
  const seen = new Set(options.seenIds ?? []); const rng = random(options.seed);
  const pool = bank.filter((q) => q.tracks.includes(profile.track) && !seen.has(q.id) && q.difficulty <= (options.maxDifficulty ?? 3));
  const candidates = profile.slots.map((slot) => pool.filter((q) => slot.topics.includes(q.topic)).map((q) => ({ q, order: rng() })).sort((a,b) => a.order-b.order).map((x) => x.q));
  const order = candidates.map((_,i) => i).sort((a,b) => candidates[a].length-candidates[b].length);
  const chosen: PracticeStation[] = new Array(profile.slots.length); const used = new Set<string>();
  function visit(index: number): boolean {
    if (index === order.length) return true;
    const slot = order[index];
    for (const q of candidates[slot]) {
      if (used.has(q.id)) continue;
      chosen[slot] = q; used.add(q.id);
      if (visit(index+1)) return true;
      used.delete(q.id);
    }
    return false;
  }
  if (!visit(0)) return { ok:false, shortages: profile.slots.filter((_,i) => candidates[i].length === 0).map((s) => s.label).concat(candidates.every((a)=>a.length>0) ? ['Not enough distinct stations to fill this combination'] : []) };
  const createdAt = options.createdAt ?? new Date().toISOString();
  const stations = chosen.map((q,i) => ({ slot:profile.slots[i].label, stationId:q.id, title:q.title, prepSeconds:profile.prepSeconds, responseSeconds:profile.responseSeconds, transitionSeconds:i === chosen.length-1 ? 0 : profile.transitionSeconds }));
  return { ok:true, plan:{ id:`practice-${profile.id}-${options.seed}`, createdAt, profileId:profile.id, seed:options.seed, contentStatus:'draft', stations,
    totalSeconds:stations.reduce((n,s)=>n+s.prepSeconds+s.responseSeconds+s.transitionSeconds,0), timingBasis:profile.timingBasis } };
}
