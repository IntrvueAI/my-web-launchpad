import { useEffect, useState } from 'react';
import type { Node, Edge } from '@xyflow/react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Trash2, Copy } from 'lucide-react';
import type { EdgeCondition } from '@/types/interviewFlow';
import type { QuestionNodeData } from './QuestionNode';
import type { EndNodeData } from './EndNode';

const db = () => (supabase as any).from('questions');

interface FullQuestion {
  id: string; subject: string; topic: string; title: string | null; question: string;
  answer: string | null; rubric: any; difficulty: number;
}

const CONDITION_OPTIONS: { value: string; label: string; condition: EdgeCondition }[] = [
  { value: 'default', label: 'Default (anything else)', condition: { type: 'default' } },
  { value: 'band_strong', label: 'Answer quality: Strong', condition: { type: 'band', value: 'strong' } },
  { value: 'band_developing', label: 'Answer quality: Developing', condition: { type: 'band', value: 'developing' } },
  { value: 'band_weak', label: 'Answer quality: Weak', condition: { type: 'band', value: 'weak' } },
  { value: 'outcome_correct_method', label: 'Outcome: correct + explained', condition: { type: 'outcome', value: 'correct_method' } },
  { value: 'outcome_correct_no_method', label: 'Outcome: correct, no explanation', condition: { type: 'outcome', value: 'correct_no_method' } },
  { value: 'outcome_incorrect', label: 'Outcome: incorrect', condition: { type: 'outcome', value: 'incorrect' } },
  { value: 'outcome_stuck', label: 'Outcome: stuck', condition: { type: 'outcome', value: 'stuck' } },
  { value: 'outcome_skipped', label: 'Outcome: skipped', condition: { type: 'outcome', value: 'skipped' } },
];

function conditionKey(condition?: EdgeCondition): string {
  if (!condition || condition.type === 'default') return 'default';
  return `${condition.type}_${condition.value}`;
}

interface NodeInspectorPanelProps {
  selectedNode: Node | null;
  selectedEdge: Edge | null;
  onUpdateNodeData: (nodeId: string, patch: Record<string, unknown>) => void;
  onUpdateEdgeCondition: (edgeId: string, condition: EdgeCondition) => void;
  onDeleteSelected: () => void;
  /** Clones the selected node (question/end only) at a small offset, keeping its data. */
  onDuplicateNode: (nodeId: string) => void;
}

export function NodeInspectorPanel({ selectedNode, selectedEdge, onUpdateNodeData, onUpdateEdgeCondition, onDeleteSelected, onDuplicateNode }: NodeInspectorPanelProps) {
  const [full, setFull] = useState<FullQuestion | null>(null);

  useEffect(() => {
    setFull(null);
    const qData = selectedNode?.type === 'question' ? (selectedNode.data as QuestionNodeData) : null;
    if (!qData?.questionId) return;
    (async () => {
      const { data } = await db().select('*').eq('id', qData.questionId).maybeSingle();
      if (data) setFull(data as FullQuestion);
    })();
  }, [selectedNode]);

  if (selectedEdge) {
    return (
      <div className="w-80 flex-none border-l bg-background p-4 space-y-4">
        <p className="text-sm font-semibold">Branch condition</p>
        <p className="text-xs text-muted-foreground">
          When should the interview follow this path to the next node?
        </p>
        <Select
          value={conditionKey(selectedEdge.data?.condition as EdgeCondition | undefined)}
          onValueChange={(key) => {
            const opt = CONDITION_OPTIONS.find((o) => o.value === key);
            if (opt) onUpdateEdgeCondition(selectedEdge.id, opt.condition);
          }}
        >
          <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            {CONDITION_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" className="w-full gap-2 text-destructive hover:text-destructive" onClick={onDeleteSelected}>
          <Trash2 className="h-3.5 w-3.5" /> Delete connection
        </Button>
      </div>
    );
  }

  if (selectedNode?.type === 'question') {
    const d = selectedNode.data as QuestionNodeData;
    return (
      <div className="w-80 flex-none border-l bg-background p-4 space-y-4 overflow-y-auto">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">Question</p>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="h-7 gap-1.5" onClick={() => onDuplicateNode(selectedNode.id)}>
              <Copy className="h-3.5 w-3.5" /> Duplicate
            </Button>
            <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-destructive hover:text-destructive" onClick={onDeleteSelected}>
              <Trash2 className="h-3.5 w-3.5" /> Remove
            </Button>
          </div>
        </div>
        {full ? (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Badge variant="outline" className="text-[10px]">{full.subject}</Badge>
              <Badge variant="outline" className="text-[10px]">{full.topic}</Badge>
              <Badge variant="secondary" className="text-[10px]">★{full.difficulty}</Badge>
            </div>
            <p className="text-sm font-medium">{full.question}</p>
            {full.answer && <p className="text-xs text-muted-foreground"><span className="font-semibold text-foreground">Answer: </span>{full.answer}</p>}
            {full.rubric?.strong && (
              <p className="text-xs text-muted-foreground"><span className="font-semibold text-foreground">Strong: </span>{full.rubric.strong}</p>
            )}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">{d.missing ? `This question (${d.questionId}) is no longer active.` : 'Loading…'}</p>
        )}
        <div className="space-y-1.5">
          <Label className="text-xs">Custom note to Clara (optional)</Label>
          <Textarea
            value={d.customNote ?? ''}
            onChange={(e) => onUpdateNodeData(selectedNode.id, { customNote: e.target.value || undefined })}
            placeholder="e.g. Give them extra time on this one — it's the hardest question in the flow."
            className="text-sm min-h-[80px]"
          />
        </div>
      </div>
    );
  }

  if (selectedNode?.type === 'end') {
    const d = selectedNode.data as EndNodeData;
    return (
      <div className="w-80 flex-none border-l bg-background p-4 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">End</p>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="h-7 gap-1.5" onClick={() => onDuplicateNode(selectedNode.id)}>
              <Copy className="h-3.5 w-3.5" /> Duplicate
            </Button>
            <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-destructive hover:text-destructive" onClick={onDeleteSelected}>
              <Trash2 className="h-3.5 w-3.5" /> Remove
            </Button>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Bespoke closing line (optional)</Label>
          <Textarea
            value={d.closingNote ?? ''}
            onChange={(e) => onUpdateNodeData(selectedNode.id, { closingNote: e.target.value || undefined })}
            placeholder="e.g. That was a strong finish — well done today."
            className="text-sm min-h-[80px]"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 flex-none border-l bg-background p-4">
      <p className="text-xs text-muted-foreground">
        Select a question, End node, or connection to edit it here. Drag questions from the left sidebar onto the canvas to add them.
      </p>
    </div>
  );
}
