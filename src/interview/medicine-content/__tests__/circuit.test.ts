import { describe, it, expect } from 'vitest';
import drafts from '@/data/interview-staging/medicine-expansion.json';
import { assembleCircuit, CIRCUIT_PROFILES } from '../expansion/circuit';

describe('Admin draft circuit assembly', () => {
  for (const profile of CIRCUIT_PROFILES) it(`fills ${profile.id} with unique matching stations`, () => {
    const result = assembleCircuit(drafts,profile,{seed:12}); expect(result.ok).toBe(true);
    if (!result.ok) return;
    const ids=result.plan.stations.map((s)=>s.stationId); expect(new Set(ids).size).toBe(ids.length);
    result.plan.stations.forEach((s,i)=>{
      const q=drafts.find((q)=>q.id===s.stationId)!;
      expect(q.tracks).toContain(profile.track); expect(profile.slots[i].topics).toContain(q.topic);
    });
    expect(result.plan.totalSeconds).toBe(result.plan.stations.reduce((n,s)=>n+s.prepSeconds+s.responseSeconds+s.transitionSeconds,0));
  });
  it('returns a coverage shortage instead of recycling seen stations', () => {
    const result=assembleCircuit(drafts,CIRCUIT_PROFILES[0],{seed:1,seenIds:drafts.map((q)=>q.id)});
    expect(result.ok).toBe(false); if (result.ok === false) expect(result.shortages.length).toBeGreaterThan(0);
  });
  it('reproduces the same circuit for the same seed', () => {
    const options={seed:42,createdAt:'2026-09-15T00:00:00Z'};
    expect(assembleCircuit(drafts,CIRCUIT_PROFILES[2],options)).toEqual(assembleCircuit(drafts,CIRCUIT_PROFILES[2],options));
  });
  it('enforces difficulty without falling back to harder questions', () => {
    const result=assembleCircuit(drafts,CIRCUIT_PROFILES[0],{seed:19,maxDifficulty:1}); expect(result.ok).toBe(false);
  });
  it('allocates the constrained slot first to avoid greedy dead ends', () => {
    const bank=[{id:'a',title:'a',question:'a',topic:'narrow',difficulty:2,tracks:['mmi']},{id:'b',title:'b',question:'b',topic:'wide',difficulty:2,tracks:['mmi']}];
    const profile={...CIRCUIT_PROFILES[2],slots:[{label:'flexible',topics:['narrow','wide']},{label:'constrained',topics:['narrow']}]};
    const result=assembleCircuit(bank,profile,{seed:1});expect(result.ok).toBe(true);
    if(result.ok)expect(result.plan.stations.map((s)=>s.stationId)).toEqual(['b','a']);
  });
  it('never adds a transition after the last station', () => {
    const profile={...CIRCUIT_PROFILES[2],transitionSeconds:120};
    const result=assembleCircuit(drafts,profile,{seed:2});expect(result.ok).toBe(true);
    if(result.ok){expect(result.plan.stations[result.plan.stations.length-1]?.transitionSeconds).toBe(0);expect(result.plan.totalSeconds).toBe(6*300+5*120);}
  });
});
