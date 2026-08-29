import { describe, it, expect } from 'vitest';
import { pickNextFlowNode, findStartNode, findFlowNode, type FlowGraph } from '../flow';
import type { Evidence } from '../types';

const ev = (overrides: Partial<Evidence> = {}): Evidence => ({
  index: 1,
  id: 'q1',
  topic: 'arithmetic',
  difficulty: 2,
  question: 'What is 7 times 8?',
  outcome: 'correct_method',
  skipped: false,
  hintsUsed: 0,
  studentAnswer: '56',
  methodQuality: 'sound',
  band: 'strong',
  notes: '',
  ...overrides,
});

describe('flow graph traversal', () => {
  it('finds the start node', () => {
    const graph: FlowGraph = {
      nodes: [{ id: 'start', type: 'start' }, { id: 'q1', type: 'question', questionId: 'bank-1' }],
      edges: [],
    };
    expect(findStartNode(graph)?.id).toBe('start');
    expect(findFlowNode(graph, 'q1')?.type).toBe('question');
    expect(findFlowNode(graph, 'missing')).toBeNull();
  });

  it('leaves Start via the sole edge when fromNodeId is null and no evidence exists yet', () => {
    const graph: FlowGraph = {
      nodes: [{ id: 'start', type: 'start' }, { id: 'q1', type: 'question', questionId: 'bank-1' }],
      edges: [{ id: 'e1', source: 'start', target: 'q1', condition: { type: 'default' } }],
    };
    expect(pickNextFlowNode(graph, null)?.id).toBe('q1');
  });

  it('prefers an exact band match over a default edge', () => {
    const graph: FlowGraph = {
      nodes: [
        { id: 'q1', type: 'question', questionId: 'bank-1' },
        { id: 'hard', type: 'question', questionId: 'bank-hard' },
        { id: 'easy', type: 'question', questionId: 'bank-easy' },
      ],
      edges: [
        { id: 'e1', source: 'q1', target: 'hard', condition: { type: 'band', value: 'strong' } },
        { id: 'e2', source: 'q1', target: 'easy', condition: { type: 'default' } },
      ],
    };
    expect(pickNextFlowNode(graph, 'q1', ev({ band: 'strong' }))?.id).toBe('hard');
    expect(pickNextFlowNode(graph, 'q1', ev({ band: 'weak' }))?.id).toBe('easy'); // no weak edge -> default
  });

  it('prefers an exact outcome match over a default edge when no band edge matches', () => {
    const graph: FlowGraph = {
      nodes: [
        { id: 'q1', type: 'question', questionId: 'bank-1' },
        { id: 'retry', type: 'question', questionId: 'bank-retry' },
        { id: 'next', type: 'question', questionId: 'bank-next' },
      ],
      edges: [
        { id: 'e1', source: 'q1', target: 'retry', condition: { type: 'outcome', value: 'stuck' } },
        { id: 'e2', source: 'q1', target: 'next', condition: { type: 'default' } },
      ],
    };
    expect(pickNextFlowNode(graph, 'q1', ev({ outcome: 'stuck', band: undefined }))?.id).toBe('retry');
    expect(pickNextFlowNode(graph, 'q1', ev({ outcome: 'correct_method' }))?.id).toBe('next');
  });

  it('falls back to the sole remaining edge when nothing else matches and there is no default', () => {
    const graph: FlowGraph = {
      nodes: [{ id: 'q1', type: 'question', questionId: 'bank-1' }, { id: 'q2', type: 'question', questionId: 'bank-2' }],
      edges: [{ id: 'e1', source: 'q1', target: 'q2', condition: { type: 'band', value: 'strong' } }],
    };
    // Evidence band is 'weak' (no matching edge), but there's exactly one outgoing edge overall.
    expect(pickNextFlowNode(graph, 'q1', ev({ band: 'weak' }))?.id).toBe('q2');
  });

  it('returns null (treated as "end here") when multiple edges exist and none match, with no default', () => {
    const graph: FlowGraph = {
      nodes: [
        { id: 'q1', type: 'question', questionId: 'bank-1' },
        { id: 'a', type: 'question', questionId: 'bank-a' },
        { id: 'b', type: 'question', questionId: 'bank-b' },
      ],
      edges: [
        { id: 'e1', source: 'q1', target: 'a', condition: { type: 'band', value: 'strong' } },
        { id: 'e2', source: 'q1', target: 'b', condition: { type: 'band', value: 'weak' } },
      ],
    };
    expect(pickNextFlowNode(graph, 'q1', ev({ band: 'developing' }))).toBeNull();
  });

  it('returns null when the node has no outgoing edges at all', () => {
    const graph: FlowGraph = { nodes: [{ id: 'q1', type: 'question', questionId: 'bank-1' }], edges: [] };
    expect(pickNextFlowNode(graph, 'q1', ev())).toBeNull();
  });

  it('resolves an End node like any other target', () => {
    const graph: FlowGraph = {
      nodes: [{ id: 'q1', type: 'question', questionId: 'bank-1' }, { id: 'end', type: 'end', closingNote: 'Well done!' }],
      edges: [{ id: 'e1', source: 'q1', target: 'end', condition: { type: 'default' } }],
    };
    const next = pickNextFlowNode(graph, 'q1', ev());
    expect(next?.type).toBe('end');
    expect(next?.closingNote).toBe('Well done!');
  });
});
