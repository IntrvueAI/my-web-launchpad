import { describe, it, expect } from 'vitest';
import {
  advanceAgent,
  initAgentState,
  type AgentDeps,
  type AgentState,
  type ChatResult,
} from '../agent';
import { mathsPack } from '../../subjects/maths/pack';
import type { BankQuestion } from '../types';

const BANK: BankQuestion[] = [
  { id: 'q1', subject: 'maths', topic: 'arithmetic', difficulty: 'standard', question: 'What is 7 times 8?', answer: '56' },
  { id: 'q2', subject: 'maths', topic: 'word-problems', difficulty: 'standard', question: 'Bus has 5 free seats…', answer: '5' },
];

const say = (content: string): ChatResult => ({ content, toolCalls: [], raw: [] });
const tool = (name: string, args: Record<string, any>): ChatResult => {
  const id = `c${Math.random().toString(36).slice(2)}`;
  return {
    content: '',
    toolCalls: [{ id, name, args }],
    raw: [{ id, type: 'function', function: { name, arguments: JSON.stringify(args) } }],
  };
};

/** A scripted fake chat LLM that returns queued responses in order, ignoring the messages. */
function fakeChat(queue: ChatResult[]) {
  return async () => {
    if (queue.length === 0) return say('(no more scripted responses)');
    return queue.shift()!;
  };
}

describe('LLM-driven agent', () => {
  it('runs a full turn loop: greet → ask → record → next → finish, building the evidence log', async () => {
    const queue: ChatResult[] = [
      say("Hi, I'm Clara! What do you enjoy about maths?"), // start
      tool('next_problem', {}), // after warm-up reply → fetch Q1
      say('Lovely. Here is your first one.'), // asks Q1
      tool('next_problem', { outcome: 'correct_method', method_quality: 'sound', note: 'clear working' }), // log Q1, fetch Q2
      say('Well done! Next one.'), // asks Q2
      tool('finish_interview', { outcome: 'incorrect', method_quality: 'partial', note: 'slipped at the end' }), // log Q2, finish
      say('Thank you so much — please end the interview to see your feedback.'),
    ];
    const deps: AgentDeps = { bank: BANK, pack: mathsPack, chat: fakeChat(queue) };
    let s: AgentState = initAgentState({ subject: 'maths', mode: 'mock', pack: mathsPack, seed: 1 });

    let r = await advanceAgent(s, { action: 'start' }, deps);
    expect(r.say).toContain('Clara');
    expect(r.state.current).toBeNull();
    expect(r.state.evidence).toHaveLength(0);

    r = await advanceAgent(r.state, { action: 'answer', studentText: 'I like number puzzles' }, deps);
    expect(r.state.current).not.toBeNull(); // Q1 now on the table
    expect(r.state.askedIds).toHaveLength(1);
    expect(r.say).not.toContain('56'); // never leak the answer

    r = await advanceAgent(r.state, { action: 'answer', studentText: 'It is 56, seven eights are fifty-six' }, deps);
    expect(r.state.evidence).toHaveLength(1);
    expect(r.state.evidence[0].outcome).toBe('correct_method');
    expect(r.state.evidence[0].studentAnswer).toContain('56');

    r = await advanceAgent(r.state, { action: 'end' }, deps);
    expect(r.done).toBe(true);
    expect(r.state.evidence).toHaveLength(2);
    expect(r.state.evidence[1].outcome).toBe('incorrect');
  });

  it('records a skip when the model marks the current problem skipped', async () => {
    const queue: ChatResult[] = [
      say('Hi! Warm-up question?'),
      tool('next_problem', {}), // fetch Q1
      say('Here is your first problem.'),
      tool('next_problem', { outcome: 'skipped' }), // student skipped Q1 → log + fetch Q2
      say("No problem, here's another."),
    ];
    const deps: AgentDeps = { bank: BANK, pack: mathsPack, chat: fakeChat(queue) };
    let s = initAgentState({ subject: 'maths', mode: 'mock', pack: mathsPack, seed: 2 });
    let r = await advanceAgent(s, { action: 'start' }, deps);
    r = await advanceAgent(r.state, { action: 'answer', studentText: 'ready' }, deps);
    r = await advanceAgent(r.state, { action: 'skip' }, deps);
    expect(r.state.evidence).toHaveLength(1);
    expect(r.state.evidence[0].skipped).toBe(true);
    expect(r.state.evidence[0].outcome).toBe('skipped');
  });
});
