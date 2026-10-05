import { describe, it, expect, vi } from 'vitest';
import { advanceAgent, initAgentState } from '../../../engine/agent';
import { MEDICINE_PRACTICE_MODES, packForMedicinePractice, PRACTICE_TIMING, FULL_MMI_MOCK, packForFullMmiMock } from '../practiceModes';
import { INTERVIEW_TYPES, INTERVIEW_TYPES_CONFIG } from '@/config/interviewTypes';
import { medicinePack } from '../pack';
import type { BankQuestion } from '../../../engine/types';
import roleplayBank from '../../../bank/questions/medicine/roleplay-stations/3.json';
import { publicQuestionPrompt } from '../../../engine/publicPrompt';

describe('Focused Medicine practice', () => {
  it('runs a six-station general mock with its own reading time and sufficient session allowance',async()=>{
    const pack=packForFullMmiMock();
    const bank:BankQuestion[]=Array.from({length:8},(_,i)=>({id:`mock-${i}`,subject:'medicine',topic:pack.topics[i%pack.topics.length].id,difficulty:2,question:`Public medical task ${i}: explain your reasoning.`,answer:'Private guidance.'}));
    const deps={pack,bank,chat:vi.fn(async()=>({content:'Thank you. Let’s move to the next station.',toolCalls:[],raw:[]}))};
    let turn=await advanceAgent(initAgentState({subject:'medicine',mode:'mock',pack,seed:1}),{action:'start'},deps);
    expect(turn.say).toContain('one minute to read the brief');
    for(let i=0;i<6;i++){
      expect(turn.done).toBe(false);
      turn=await advanceAgent(turn.state,{action:'time_up',expectedQuestionIndex:i,studentText:'I would clarify the situation and consider the people affected.'},deps);
    }
    expect(turn.done).toBe(true);expect(turn.state.evidence).toHaveLength(6);
    expect(new Set(turn.state.askedIds).size).toBe(6);
    expect(FULL_MMI_MOCK.timing).toEqual({prep:60,response:300});
    expect(INTERVIEW_TYPES[FULL_MMI_MOCK.id].duration*60).toBeGreaterThan(6*360);
    expect(INTERVIEW_TYPES['medicine-mmi'].timingSeconds?.prep).toBe(120);
    expect(INTERVIEW_TYPES['medicine-mmi-manchester'].timingSeconds?.prep).toBe(0);
  });
  it('gives the candidate their role without revealing actor secrets or the rubric', async () => {
    const question = roleplayBank.find(q => q.id === 'MED-RP-013') as BankQuestion;
    const mode = MEDICINE_PRACTICE_MODES[1];
    const pack = packForMedicinePractice(mode);
    const chat = vi.fn();
    const opening = await advanceAgent(initAgentState({ subject:'medicine', mode:'mock', pack, seed:1 }), { action:'start' }, { pack, bank:[question], chat });
    expect(opening.say).toContain(question.roleplay!.applicantRole);
    expect(opening.say).toContain('Speak directly to me as that person');
    expect(opening.say).toContain('one minute to read the brief');
    expect(opening.say).not.toContain('The roleplay starts now');
    expect(opening.say).toContain(question.roleplay!.openingStatement);
    expect(publicQuestionPrompt(question)).toContain('Speak directly to Amara');
    for (const fact of question.roleplay!.hiddenFacts) {
      expect(opening.say).not.toContain(fact.fact);
      expect(publicQuestionPrompt(question)).not.toContain(fact.fact);
    }
    expect(opening.say).not.toContain(question.rubric!.strong);
    expect(chat).not.toHaveBeenCalled();
  });
  it.each(MEDICINE_PRACTICE_MODES)('$label opens directly on an authored station and finishes on its bell', async mode => {
    const pack = packForMedicinePractice(mode);
    const bank: BankQuestion[] = [1,2].map(index => ({ id:`practice-${index}`, subject:'medicine', topic:mode.topic, difficulty:2, question:`Scenario ${index}: explain your reasoning.`, answer:'Private marking guidance.' }));
    const chat = vi.fn(async () => ({ content:'Could you say more?', toolCalls:[], raw:[] }));
    const deps = { pack, bank, chat };
    const state = initAgentState({ subject:'medicine', mode:'mock', pack, seed:1 });
    const opening = await advanceAgent(state, { action:'start' }, deps);
    expect(chat).not.toHaveBeenCalled();
    expect(opening.say).toContain(opening.state.current!.question);
    expect(opening.say).not.toContain('Private marking');
    expect(opening.state.targetQuestions).toBe(1);
    const ended = await advanceAgent(opening.state, { action:'time_up', expectedQuestionIndex:0, studentText:'I would clarify the concern and explain my reasoning.' }, deps);
    expect(ended.done).toBe(true);
    expect(ended.state.askedIds).toHaveLength(1);
    expect(ended.state.evidence).toHaveLength(1);
    expect(ended.state.evidence[0].studentAnswer).toContain('clarify the concern');
  });
  it('uses the same rubric labels on selection, result screens and the scoring prompt', () => {
    for (const id of ['medicine-mmi','medicine-mmi-manchester', ...MEDICINE_PRACTICE_MODES.map(mode => mode.id)] as const) {
      expect(INTERVIEW_TYPES[id].scoringCriteria).toEqual(medicinePack.domains);
      expect(INTERVIEW_TYPES_CONFIG[id].sections.map(section => section.title)).toEqual(medicinePack.domains);
    }
    for (const mode of MEDICINE_PRACTICE_MODES) {
      expect(INTERVIEW_TYPES[mode.id].timingSeconds).toEqual(PRACTICE_TIMING);
      expect(INTERVIEW_TYPES[mode.id].duration).toBeLessThanOrEqual(8);
    }
    expect(INTERVIEW_TYPES['medicine-mmi-manchester'].timingSeconds?.response).toBe(480);
  });
});
