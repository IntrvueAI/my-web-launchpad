import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ReactFlow, ReactFlowProvider, Background, Controls, MiniMap,
  useNodesState, useEdgesState, addEdge, useReactFlow,
  type Node, type Edge, type Connection, type NodeTypes, type EdgeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useAdminStatus } from '@/hooks/useAdminStatus';
import { useInterviewFlow, type FlowDraftInput } from '@/hooks/useInterviewFlowsAdmin';
import { useQuestionBank } from '@/hooks/useQuestionBank';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Settings, Save, CheckCircle2, Trash2 } from 'lucide-react';
import { StartNode } from '@/components/admin/flow-builder/StartNode';
import { QuestionNode, type QuestionNodeData } from '@/components/admin/flow-builder/QuestionNode';
import { EndNode, type EndNodeData } from '@/components/admin/flow-builder/EndNode';
import { ConditionEdge } from '@/components/admin/flow-builder/ConditionEdge';
import { QuestionPickerSidebar, type PickerQuestion } from '@/components/admin/flow-builder/QuestionPickerSidebar';
import { NodeInspectorPanel } from '@/components/admin/flow-builder/NodeInspectorPanel';
import { FlowMetadataPanel } from '@/components/admin/flow-builder/FlowMetadataPanel';
import { validateFlowGraph, type EdgeCondition, type FlowGraph } from '@/types/interviewFlow';

const nodeTypes: NodeTypes = { start: StartNode, question: QuestionNode, end: EndNode };
const edgeTypes: EdgeTypes = { condition: ConditionEdge };

const flowsDb = () => (supabase as any).from('interview_flows');

function graphToFlow(graph: FlowGraph): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = graph.nodes.map((n, i) => ({
    id: n.id,
    type: n.type,
    position: n.position ?? { x: 80 + (i % 4) * 260, y: 80 + Math.floor(i / 4) * 160 },
    data: n.type === 'question'
      ? { questionId: n.questionId, customNote: n.customNote }
      : n.type === 'end'
        ? { closingNote: n.closingNote }
        : {},
    deletable: n.type !== 'start',
  }));
  const edges: Edge[] = graph.edges.map((e) => ({
    id: e.id, source: e.source, target: e.target, type: 'condition', data: { condition: e.condition },
  }));
  return { nodes, edges };
}

function flowToGraph(nodes: Node[], edges: Edge[]): FlowGraph {
  return {
    nodes: nodes.map((n) => ({
      id: n.id,
      type: n.type as 'start' | 'question' | 'end',
      position: n.position,
      ...(n.type === 'question' ? { questionId: (n.data as QuestionNodeData).questionId, customNote: (n.data as QuestionNodeData).customNote } : {}),
      ...(n.type === 'end' ? { closingNote: (n.data as EndNodeData).closingNote } : {}),
    })),
    edges: edges.map((e) => ({
      id: e.id, source: e.source, target: e.target,
      condition: (e.data?.condition as EdgeCondition) ?? { type: 'default' },
    })),
  };
}

function EditorInner({ flowId }: { flowId: string }) {
  const { toast } = useToast();
  const { flow, loading, error, saveGraph, reload } = useInterviewFlow(flowId);
  const { screenToFlowPosition } = useReactFlow();
  const wrapperRef = useRef<HTMLDivElement>(null);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [loadedOnce, setLoadedOnce] = useState(false);
  // One fetch, owned here and passed down to the sidebar — replaces what used to be 3 separate
  // hits on the `questions` table (the picker's own list, an active-ids check, and a per-node
  // display-data lookup); node resolution below is now an in-memory map lookup, not its own fetch.
  const { activeQuestions, activeQuestionIds, questionsById, loading: questionsLoading } = useQuestionBank();

  // Hydrate the canvas once, when the flow first loads (don't re-hydrate on every save-refresh).
  useEffect(() => {
    if (!flow || loadedOnce) return;
    const { nodes: n, edges: e } = graphToFlow(flow.graph);
    setNodes(n);
    setEdges(e);
    setLoadedOnce(true);
  }, [flow, loadedOnce, setNodes, setEdges]);

  // Resolve question node display data (title/subject/etc.) from the already-cached bank list, and
  // flag any question that's been retired/deleted since the flow was last saved.
  useEffect(() => {
    if (questionsById.size === 0) return;
    setNodes((prev) => prev.map((n) => {
      if (n.type !== 'question') return n;
      const qd = n.data as QuestionNodeData;
      const row = qd.questionId ? questionsById.get(qd.questionId) : null;
      return {
        ...n,
        data: {
          ...qd,
          subject: row?.subject, topic: row?.topic, title: row?.title, questionText: row?.question, difficulty: row?.difficulty,
          missing: !!qd.questionId && !activeQuestionIds.has(qd.questionId),
        },
      };
    }));
    // Only re-resolve when the bank data itself arrives/changes or the SET of question ids on the
    // canvas changes — not on every drag/position update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionsById, activeQuestionIds, nodes.map((n) => (n.data as QuestionNodeData)?.questionId).join(',')]);

  const markDirty = useCallback(() => setDirty(true), []);

  const onConnect = useCallback((connection: Connection) => {
    setEdges((eds) => addEdge({ ...connection, type: 'condition', data: { condition: { type: 'default' } } }, eds));
    markDirty();
  }, [setEdges, markDirty]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData('application/x-intrvue-question');
    if (!raw) return;
    const q = JSON.parse(raw) as PickerQuestion;
    const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });
    const id = `q-${crypto.randomUUID().slice(0, 8)}`;
    const newNode: Node = {
      id, type: 'question', position,
      data: { questionId: q.id, subject: q.subject, topic: q.topic, title: q.title, questionText: q.question, difficulty: q.difficulty },
    };
    setNodes((nds) => [...nds, newNode]);
    markDirty();
  }, [screenToFlowPosition, setNodes, markDirty]);

  const onDragStartQuestion = useCallback((q: PickerQuestion, e: React.DragEvent) => {
    e.dataTransfer.setData('application/x-intrvue-question', JSON.stringify(q));
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const addEndNode = useCallback(() => {
    const id = `end-${crypto.randomUUID().slice(0, 8)}`;
    const center = wrapperRef.current
      ? screenToFlowPosition({ x: wrapperRef.current.clientWidth / 2, y: wrapperRef.current.clientHeight / 2 })
      : { x: 400, y: 300 };
    setNodes((nds) => [...nds, { id, type: 'end', position: center, data: {} }]);
    markDirty();
  }, [screenToFlowPosition, setNodes, markDirty]);

  const selectedNode = useMemo(() => nodes.find((n) => n.id === selectedNodeId) ?? null, [nodes, selectedNodeId]);
  const selectedEdge = useMemo(() => edges.find((e) => e.id === selectedEdgeId) ?? null, [edges, selectedEdgeId]);

  const onUpdateNodeData = useCallback((nodeId: string, patch: Record<string, unknown>) => {
    setNodes((nds) => nds.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, ...patch } } : n)));
    markDirty();
  }, [setNodes, markDirty]);

  const onUpdateEdgeCondition = useCallback((edgeId: string, condition: EdgeCondition) => {
    setEdges((eds) => eds.map((e) => (e.id === edgeId ? { ...e, data: { ...e.data, condition } } : e)));
    markDirty();
  }, [setEdges, markDirty]);

  const deleteSelected = useCallback(() => {
    if (selectedNodeId) {
      setNodes((nds) => nds.filter((n) => n.id !== selectedNodeId));
      setEdges((eds) => eds.filter((e) => e.source !== selectedNodeId && e.target !== selectedNodeId));
      setSelectedNodeId(null);
    }
    if (selectedEdgeId) {
      setEdges((eds) => eds.filter((e) => e.id !== selectedEdgeId));
      setSelectedEdgeId(null);
    }
    markDirty();
  }, [selectedNodeId, selectedEdgeId, setNodes, setEdges, markDirty]);

  const duplicateNode = useCallback((nodeId: string) => {
    setNodes((nds) => {
      const source = nds.find((n) => n.id === nodeId);
      if (!source || source.type === 'start') return nds; // only one Start ever allowed
      const prefix = source.type === 'end' ? 'end' : 'q';
      const id = `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
      const clone: Node = {
        ...source,
        id,
        position: { x: source.position.x + 40, y: source.position.y + 40 },
        selected: false,
        data: { ...source.data },
      };
      setSelectedNodeId(id);
      return [...nds, clone];
    });
    markDirty();
  }, [setNodes, markDirty]);

  const saveNow = useCallback(async (opts?: { silent?: boolean }) => {
    setSaving(true);
    const ok = await saveGraph(flowToGraph(nodes, edges));
    setSaving(false);
    if (ok) {
      setDirty(false);
      if (!opts?.silent) toast({ title: 'Flow saved' });
    }
    return ok;
  }, [nodes, edges, saveGraph, toast]);

  const handleSave = useCallback(() => { saveNow(); }, [saveNow]);

  // Auto-save draft work 2.5s after the last change — no more losing an edit because you forgot to
  // click Save. Silent (no toast) so it doesn't compete with an explicit Save click's confirmation.
  // Safe to run this freely since it only ever touches the draft graph, never the "ready" status —
  // that only changes via the explicit, validated handleMarkReady below.
  useEffect(() => {
    if (!dirty || !loadedOnce) return;
    const timer = setTimeout(() => { saveNow({ silent: true }); }, 2500);
    return () => clearTimeout(timer);
  }, [dirty, nodes, edges, loadedOnce, saveNow]);

  const handleMarkReady = useCallback(async () => {
    const graph = flowToGraph(nodes, edges);
    const issues = validateFlowGraph(graph, activeQuestionIds);
    const errors = issues.filter((i) => i.severity === 'error');
    if (errors.length > 0) {
      toast({ title: `Can't mark as ready — ${errors.length} issue(s)`, description: errors.map((i) => i.message).join(' '), variant: 'destructive' });
      return;
    }
    // One atomic write (not save-then-separately-update-status) — a network blip between two
    // separate calls used to be able to leave the graph saved but status stuck on "draft".
    const { error: writeError } = await flowsDb().update({ graph, status: 'ready' }).eq('id', flowId);
    if (writeError) {
      toast({ title: "Couldn't mark as ready", description: writeError.message, variant: 'destructive' });
      return;
    }
    const warnings = issues.filter((i) => i.severity === 'warning');
    if (warnings.length > 0) {
      toast({ title: `Marked ready with ${warnings.length} warning(s)`, description: warnings.map((i) => i.message).join(' ') });
    } else {
      toast({ title: 'Marked as ready to launch' });
    }
    setDirty(false);
    reload();
  }, [nodes, edges, activeQuestionIds, flowId, reload, toast]);

  // Live validation so problems surface as you build, not just when you click "Mark as ready".
  const liveIssues = useMemo(() => validateFlowGraph(flowToGraph(nodes, edges), activeQuestionIds), [nodes, edges, activeQuestionIds]);
  const liveErrorCount = liveIssues.filter((i) => i.severity === 'error').length;
  const liveWarningCount = liveIssues.filter((i) => i.severity === 'warning').length;

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  if (error) return <div className="min-h-screen bg-background flex items-center justify-center px-4 text-center"><p className="text-destructive max-w-md">Failed to load this flow: {error}</p></div>;
  if (!flow) return <div className="min-h-screen bg-background flex items-center justify-center px-4 text-center"><p className="text-muted-foreground">Flow not found.</p></div>;

  return (
    <div className="h-screen flex flex-col bg-background">
      <div className="border-b px-4 py-2.5 flex items-center justify-between gap-3 flex-none">
        <div className="flex items-center gap-3 min-w-0">
          <Button asChild variant="ghost" size="sm" className="gap-1.5 flex-none">
            <Link to="/admin/interview-flow-builder"><ArrowLeft className="h-4 w-4" /> Flows</Link>
          </Button>
          <span className="font-semibold truncate">{flow.name}</span>
          <Badge variant={flow.status === 'ready' ? 'default' : 'outline'}>{flow.status === 'ready' ? 'Ready' : 'Draft'}</Badge>
          {liveErrorCount > 0 && (
            <Badge variant="destructive" title={liveIssues.filter((i) => i.severity === 'error').map((i) => i.message).join(' ')}>
              {liveErrorCount} issue{liveErrorCount === 1 ? '' : 's'}
            </Badge>
          )}
          {liveErrorCount === 0 && liveWarningCount > 0 && (
            <Badge variant="outline" className="text-amber-600 dark:text-amber-400 border-amber-500/40" title={liveIssues.map((i) => i.message).join(' ')}>
              {liveWarningCount} warning{liveWarningCount === 1 ? '' : 's'}
            </Badge>
          )}
          {dirty && <span className="text-xs text-muted-foreground">{saving ? 'Saving…' : 'Unsaved changes'}</span>}
        </div>
        <div className="flex items-center gap-2 flex-none">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={addEndNode}>Add End node</Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setSettingsOpen(true)}><Settings className="h-3.5 w-3.5" /> Settings</Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleSave} disabled={saving}><Save className="h-3.5 w-3.5" /> {saving ? 'Saving…' : 'Save'}</Button>
          <Button size="sm" className="gap-1.5" onClick={handleMarkReady}><CheckCircle2 className="h-3.5 w-3.5" /> Mark as ready</Button>
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        <QuestionPickerSidebar onDragStartQuestion={onDragStartQuestion} questions={activeQuestions} loading={questionsLoading} />

        <div className="flex-1 relative" ref={wrapperRef}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={(changes) => {
              onNodesChange(changes);
              // React Flow fires internal 'dimensions' (post-mount size measurement) and 'select'
              // changes constantly — marking dirty for those meant every page load (and every
              // click) looked like an edit, which with autosave above would mean writing to the
              // DB on every load even with zero real changes. Only genuine edits count.
              if (changes.some((c) => c.type === 'add' || c.type === 'remove' || c.type === 'position')) markDirty();
            }}
            onEdgesChange={(changes) => {
              onEdgesChange(changes);
              if (changes.some((c) => c.type === 'add' || c.type === 'remove')) markDirty();
            }}
            onConnect={onConnect}
            onDrop={onDrop}
            onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
            onNodeClick={(_, n) => { setSelectedNodeId(n.id); setSelectedEdgeId(null); }}
            onEdgeClick={(_, e) => { setSelectedEdgeId(e.id); setSelectedNodeId(null); }}
            onPaneClick={() => { setSelectedNodeId(null); setSelectedEdgeId(null); }}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            deleteKeyCode={['Backspace', 'Delete']}
          >
            <Background />
            <Controls />
            <MiniMap pannable zoomable className="!bg-card" />
          </ReactFlow>
        </div>

        <NodeInspectorPanel
          selectedNode={selectedNode}
          selectedEdge={selectedEdge}
          onUpdateNodeData={onUpdateNodeData}
          onUpdateEdgeCondition={onUpdateEdgeCondition}
          onDeleteSelected={deleteSelected}
          onDuplicateNode={duplicateNode}
        />
      </div>

      <FlowMetadataPanel
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        flow={flow}
        onSave={async (input: FlowDraftInput) => {
          const { error: saveError } = await flowsDb().update(input).eq('id', flowId);
          if (saveError) {
            toast({ title: "Couldn't save settings", description: saveError.message, variant: 'destructive' });
            return false;
          }
          toast({ title: 'Settings saved' });
          reload();
          return true;
        }}
      />
    </div>
  );
}

export default function AdminInterviewFlowEditor() {
  const { isAdmin, isLoading } = useAdminStatus();
  const { flowId } = useParams<{ flowId: string }>();

  if (isLoading) return <div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  if (!isAdmin) return <div className="min-h-screen bg-background flex items-center justify-center px-4 text-center"><p className="text-muted-foreground">Admin access required.</p></div>;
  if (!flowId) return <div className="min-h-screen bg-background flex items-center justify-center px-4 text-center"><p className="text-muted-foreground">Missing flow id.</p></div>;

  return (
    <ReactFlowProvider>
      <EditorInner flowId={flowId} />
    </ReactFlowProvider>
  );
}
