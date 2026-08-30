/**
 * Flow graph types + traversal (the admin-built "Intrvue A/B/C" flowchart interviews).
 *
 * An admin-authored flow is a DAG of exact bank questions, with branches based on the SAME
 * outcome/band vocabulary the brain already scores on (see types.ts's `Outcome`/`Evidence`) — not
 * a new rating system. This is the alternative to the adaptive `selectQuestion`/`nextDifficulty`
 * path: a flow-driven `AgentState.flow` makes `agent.ts`'s `executeTool` walk this graph instead.
 *
 * Pure and dependency-free, like adapt.ts/select.ts, so it vendors verbatim into Deno.
 */
import type { Evidence, Outcome } from './types.ts';

export type FlowNodeType = 'start' | 'question' | 'end';

export interface FlowNode {
  id: string;
  type: FlowNodeType;
  /** Required when type === 'question' — the bank question this node asks. */
  questionId?: string;
  /** Optional free-text guidance folded into the prompt while this question is on the table. */
  customNote?: string;
  /** Optional bespoke closing line — type === 'end' only. */
  closingNote?: string;
  /** Canvas position in the builder — irrelevant to execution, carried through so re-opening a
   *  flow restores its layout instead of re-stacking every node at the origin. */
  position?: { x: number; y: number };
}

export type EdgeCondition =
  | { type: 'band'; value: 'strong' | 'developing' | 'weak' }
  | { type: 'outcome'; value: Outcome }
  | { type: 'default' };

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  condition: EdgeCondition;
}

export interface FlowGraph {
  nodes: FlowNode[];
  edges: FlowEdge[];
}

export function findStartNode(graph: FlowGraph): FlowNode | null {
  return graph.nodes.find((n) => n.type === 'start') ?? null;
}

export function findFlowNode(graph: FlowGraph, id: string | null | undefined): FlowNode | null {
  if (!id) return null;
  return graph.nodes.find((n) => n.id === id) ?? null;
}

/**
 * Resolve the next node from `fromNodeId`'s outgoing edges against the just-recorded evidence.
 * Precedence: exact band match > exact outcome match > a `default` edge > the sole remaining edge
 * if exactly one exists and nothing else matched. Returns null if no route resolves — the caller
 * treats that as "end the interview here" (a builder validation gap, not a crash).
 *
 * `fromNodeId: null` means "leaving Start" (the very first call, before any evidence exists) —
 * `evidence` is correctly `undefined` there too, which degrades straight to default/single-edge,
 * exactly what Start needs (its outgoing edge should never carry a band/outcome condition).
 */
export function pickNextFlowNode(graph: FlowGraph, fromNodeId: string | null, evidence?: Evidence): FlowNode | null {
  const from = fromNodeId ?? findStartNode(graph)?.id;
  if (!from) return null;
  const outgoing = graph.edges.filter((e) => e.source === from);
  if (outgoing.length === 0) return null;

  if (evidence) {
    const bandMatch = outgoing.find((e) => e.condition.type === 'band' && e.condition.value === evidence.band);
    if (bandMatch) return findFlowNode(graph, bandMatch.target);
    const outcomeMatch = outgoing.find((e) => e.condition.type === 'outcome' && e.condition.value === evidence.outcome);
    if (outcomeMatch) return findFlowNode(graph, outcomeMatch.target);
  }
  const defaultEdge = outgoing.find((e) => e.condition.type === 'default');
  if (defaultEdge) return findFlowNode(graph, defaultEdge.target);
  if (outgoing.length === 1) return findFlowNode(graph, outgoing[0].target);
  return null;
}
