import { describe, it, expect } from 'vitest';
import { advanceAgent, initAgentState, type AgentDeps, type AgentState, type ChatResult } from '../agent';
import { mathsPack } from '../../subjects/maths/pack';
import type { BankQuestion } from '../types';
import type { FlowGraph } from '../flow';

// A tiny 3-question branching flow: Start -> Q1 -> (strong -> Hard, default -> Easy) -> End.
const FLOW: FlowGraph = {
  nodes: [
    { id: 'start', type: 'start' },
    { id: 'n-q1', type: 'question', questionId: 'bank-q1' },
    { id: 'n-hard', type: 'question', questionId: 'bank-hard', customNote: 'This is the hard branch — give them real time.' },
    { id: 'n-easy', type: 'question', questionId: 'bank-easy' },
    { id: 'n-end', type: 'end', closingNote: 'Great work today — that was a real pleasure.' },
  ],
  edges: [
    { id: 'e0', source: 'start', target: 'n-q1', condition: { type: 'default' } },
    { id: 'e1', source: 'n-q1', target: 'n-hard', condition: { type: 'band', value: 'strong' } },
    { id: 'e2', source: 'n-q1', target: 'n-easy', condition: { type: 'default' } },
    { id: 'e3', source: 'n-hard', target: 'n-end', condition: { type: 'default' } },
    { id: 'e4', source: 'n-easy', target: 'n-end', condition: { type: 'default' } },
  ],
};

const BANK: BankQuestion[] = [
  { id: 'bank-q1', subject: 'test', topic: 't', difficulty: 2, question: 'Q1: what is 7 times 8?', answer: '56' },
  { id: 'bank-hard', subject: 'test', topic: 't', difficulty: 4, question: 'The hard one.', answer: 'hard-answer' },
  { id: 'bank-easy', subject: 'test', topic: 't', difficulty: 2, question: 'The easy one.', answer: 'easy-answer' },
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

function fakeChat(queue: ChatResult[]) {
  return async () => {
    if (queue.length === 0) return say('(no more scripted responses)');
    return queue.shift()!;
  };
}

function makeDeps(queue: ChatResult[]): AgentDeps {
  return { bank: BANK, pack: mathsPack, chat: fakeChat(queue), flowGraph: FLOW };
}

describe('flow-driven agent (admin-built "Intrvue A/B/C" interviews)', () => {
  it('a strong answer routes to the hard branch; a weak answer routes to the easy branch', async () => {
    // Run A: strong answer to Q1 -> should be served the hard question next.
    const queueA: ChatResult[] = [
      say('Hi, ready when you are.'),
      tool('next_problem', {}), // leave Start -> Q1
      say('Here is your first one.'),
      tool('next_problem', { outcome: 'correct_method', method_quality: 'sound', band: 'strong', note: 'clean' }),
      say('Great, next one.'),
    ];
    const depsA = makeDeps(queueA);
    let rA = await advanceAgent(initAgentState({ subject: 'custom-flow', mode: 'mock', pack: mathsPack, seed: 1, flowId: 'flow-1' }), { action: 'start' }, depsA);
    rA = await advanceAgent(rA.state, { action: 'answer', studentText: 'ready' }, depsA);
    expect(rA.state.current?.id).toBe('bank-q1');
    rA = await advanceAgent(rA.state, { action: 'answer', studentText: '56, seven eights are fifty-six' }, depsA);
    expect(rA.state.current?.id).toBe('bank-hard');
    expect(rA.state.currentNodeNote).toContain('hard branch');

    // Run B: weak/incorrect answer to Q1 -> no explicit "weak" edge, falls through to the default
    // edge -> should be served the easy question next.
    const queueB: ChatResult[] = [
      say('Hi, ready when you are.'),
      tool('next_problem', {}),
      say('Here is your first one.'),
      tool('next_problem', { outcome: 'incorrect', method_quality: 'none', band: 'weak', note: 'stuck' }),
      say('No worries, next one.'),
    ];
    const depsB = makeDeps(queueB);
    let rB = await advanceAgent(initAgentState({ subject: 'custom-flow', mode: 'mock', pack: mathsPack, seed: 2, flowId: 'flow-1' }), { action: 'start' }, depsB);
    rB = await advanceAgent(rB.state, { action: 'answer', studentText: 'ready' }, depsB);
    rB = await advanceAgent(rB.state, { action: 'answer', studentText: 'not sure' }, depsB);
    expect(rB.state.current?.id).toBe('bank-easy');
    expect(rB.state.currentNodeNote).toBeUndefined();
  });

  it('rejects next_problem with an unrecorded question on the table, same as the adaptive path', async () => {
    const queue: ChatResult[] = [
      say('Hi there.'),
      tool('next_problem', {}), // fetch Q1 — fine
      say('Here is your first problem.'),
      tool('next_problem', {}), // forgot the outcome -> must be rejected
      tool('next_problem', { outcome: 'correct_method', band: 'strong' }), // retries correctly
      say('Nice, next one.'),
    ];
    const deps = makeDeps(queue);
    let r = await advanceAgent(initAgentState({ subject: 'custom-flow', mode: 'mock', pack: mathsPack, seed: 3, flowId: 'flow-1' }), { action: 'start' }, deps);
    r = await advanceAgent(r.state, { action: 'answer', studentText: 'ready' }, deps);
    const q1 = r.state.current!.id;
    expect(r.state.evidence).toHaveLength(0);

    r = await advanceAgent(r.state, { action: 'answer', studentText: '56' }, deps);
    // Q1 was recorded despite the model's failed first attempt to skip it, and routed onward.
    expect(r.state.evidence).toHaveLength(1);
    expect(r.state.current!.id).not.toBe(q1);
    expect(r.state.current!.id).toBe('bank-hard');
  });

  it('reaching an End node finishes the interview with its closing note, even if the model never calls finish_interview', async () => {
    const queue: ChatResult[] = [
      say('Hi there.'),
      tool('next_problem', {}), // -> Q1
      say('Here is your first problem.'),
      tool('next_problem', { outcome: 'correct_method', band: 'strong' }), // -> hard
      say('Great, next one.'),
      // Answers the hard question; its only outgoing edge leads to the End node. The model just
      // chats afterward instead of calling finish_interview — the deterministic backstop must
      // still close the interview.
      tool('next_problem', { outcome: 'correct_method', band: 'strong' }),
      say("That's everything for today, thanks so much."),
    ];
    const deps = makeDeps(queue);
    let r = await advanceAgent(initAgentState({ subject: 'custom-flow', mode: 'mock', pack: mathsPack, seed: 4, flowId: 'flow-1' }), { action: 'start' }, deps);
    r = await advanceAgent(r.state, { action: 'answer', studentText: 'ready' }, deps);
    expect(r.state.current?.id).toBe('bank-q1');
    r = await advanceAgent(r.state, { action: 'answer', studentText: '56' }, deps);
    expect(r.state.current?.id).toBe('bank-hard');
    r = await advanceAgent(r.state, { action: 'answer', studentText: 'the hard answer' }, deps);

    expect(r.done).toBe(true);
    expect(r.state.done).toBe(true);
    expect(r.state.flow?.currentNodeId).toBe('n-end');
    expect(r.state.current).toBeNull();
  });
});
