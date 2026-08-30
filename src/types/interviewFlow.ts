/**
 * Client-side flow types + validation for the admin flow builder (/admin/interview-flow-builder).
 * Mirrors src/interview/engine/flow.ts's FlowGraph/FlowNode/FlowEdge shape exactly — that file is
 * the runtime contract the brain executes; this one adds zod validation for the builder UI only.
 * Deliberately NOT vendored to Deno (uses zod), same as src/interview/bank/schema.ts's precedent.
 */
import { z } from 'zod';

export const EdgeConditionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('band'), value: z.enum(['strong', 'developing', 'weak']) }),
  z.object({
    type: z.literal('outcome'),
    value: z.enum(['correct_method', 'correct_no_method', 'incorrect', 'stuck', 'skipped', 'incomplete']),
  }),
  z.object({ type: z.literal('default') }),
]);
export type EdgeCondition = z.infer<typeof EdgeConditionSchema>;

export const FlowNodeSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['start', 'question', 'end']),
  questionId: z.string().optional(),
  customNote: z.string().optional(),
  closingNote: z.string().optional(),
  position: z.object({ x: z.number(), y: z.number() }).optional(),
});
export type FlowNode = z.infer<typeof FlowNodeSchema>;

export const FlowEdgeSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  target: z.string().min(1),
  condition: EdgeConditionSchema,
});
export type FlowEdge = z.infer<typeof FlowEdgeSchema>;

export const FlowGraphSchema = z.object({
  nodes: z.array(FlowNodeSchema),
  edges: z.array(FlowEdgeSchema),
});
export type FlowGraph = z.infer<typeof FlowGraphSchema>;

export interface InterviewFlowRow {
  id: string;
  name: string;
  description: string | null;
  graph: FlowGraph;
  domains: string[];
  scoring_philosophy: string | null;
  custom_instructions: string | null;
  cost_credits: number;
  estimated_duration: number;
  status: 'draft' | 'ready';
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface FlowValidationIssue {
  severity: 'error' | 'warning';
  message: string;
}

/**
 * Publish-time ("mark as ready") validation. Hard errors block; warnings don't. A question node's
 * `questionId` is checked against `activeQuestionIds` (the live, non-retired bank) so a flow can't
 * be marked ready referencing a question that's since been deleted or retired.
 */
export function validateFlowGraph(graph: FlowGraph, activeQuestionIds: Set<string>): FlowValidationIssue[] {
  const issues: FlowValidationIssue[] = [];
  const startNodes = graph.nodes.filter((n) => n.type === 'start');
  const endNodes = graph.nodes.filter((n) => n.type === 'end');

  if (startNodes.length !== 1) {
    issues.push({ severity: 'error', message: `A flow needs exactly one Start node (found ${startNodes.length}).` });
  }
  if (endNodes.length === 0) {
    issues.push({ severity: 'error', message: 'A flow needs at least one End node.' });
  }

  for (const node of graph.nodes) {
    if (node.type === 'question' && !node.questionId) {
      issues.push({ severity: 'error', message: `Question node "${node.id}" has no question selected.` });
    }
    if (node.type === 'question' && node.questionId && !activeQuestionIds.has(node.questionId)) {
      issues.push({ severity: 'error', message: `Question node "${node.id}" references a question that's no longer active (${node.questionId}).` });
    }
  }

  // DAG check: a simple cycle-detection DFS over the edge list.
  const adjacency = new Map<string, string[]>();
  for (const edge of graph.edges) {
    if (!adjacency.has(edge.source)) adjacency.set(edge.source, []);
    adjacency.get(edge.source)!.push(edge.target);
  }
  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Map<string, number>();
  let hasCycle = false;
  const visit = (id: string) => {
    if (hasCycle) return;
    color.set(id, GRAY);
    for (const next of adjacency.get(id) ?? []) {
      const c = color.get(next) ?? WHITE;
      if (c === GRAY) { hasCycle = true; return; }
      if (c === WHITE) visit(next);
    }
    color.set(id, BLACK);
  };
  for (const node of graph.nodes) {
    if ((color.get(node.id) ?? WHITE) === WHITE) visit(node.id);
  }
  if (hasCycle) issues.push({ severity: 'error', message: 'The flow contains a cycle — flows must be a one-way diagram with no loops.' });

  // Reachability: every node should be reachable from Start (soft warning — an unreachable node
  // is dead content, not a broken interview).
  if (startNodes.length === 1) {
    const seen = new Set<string>();
    const stack = [startNodes[0].id];
    while (stack.length) {
      const id = stack.pop()!;
      if (seen.has(id)) continue;
      seen.add(id);
      for (const next of adjacency.get(id) ?? []) stack.push(next);
    }
    const unreachable = graph.nodes.filter((n) => n.type !== 'start' && !seen.has(n.id));
    if (unreachable.length) {
      issues.push({ severity: 'warning', message: `${unreachable.length} node(s) aren't reachable from Start: ${unreachable.map((n) => n.id).join(', ')}.` });
    }
  }

  // Dead-end warning: a question node with more than one outgoing edge but no `default` among
  // them can leave an unanticipated outcome with nowhere to go.
  for (const node of graph.nodes) {
    if (node.type !== 'question') continue;
    const outgoing = graph.edges.filter((e) => e.source === node.id);
    if (outgoing.length > 1 && !outgoing.some((e) => e.condition.type === 'default')) {
      issues.push({ severity: 'warning', message: `"${node.id}" has multiple branches but no "Default" edge — an unexpected answer quality could dead-end here.` });
    }
  }

  return issues;
}
