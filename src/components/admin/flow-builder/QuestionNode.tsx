import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface QuestionNodeData {
  questionId?: string;
  title?: string;
  subject?: string;
  topic?: string;
  difficulty?: number;
  questionText?: string;
  customNote?: string;
  /** True when questionId no longer resolves to an active bank question (retired/deleted). */
  missing?: boolean;
  [key: string]: unknown;
}

export function QuestionNode({ data, selected }: NodeProps) {
  const d = data as QuestionNodeData;
  return (
    <Card className={cn('w-64', selected && 'ring-2 ring-primary', d.missing && 'border-destructive')}>
      <Handle type="target" position={Position.Left} />
      <CardContent className="p-3 space-y-1.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          {d.subject && <Badge variant="outline" className="text-[10px] px-1.5 py-0">{d.subject}</Badge>}
          {typeof d.difficulty === 'number' && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">★{d.difficulty}</Badge>}
          {d.missing && (
            <Badge variant="destructive" className="text-[10px] px-1.5 py-0 gap-1">
              <AlertTriangle className="h-2.5 w-2.5" /> missing
            </Badge>
          )}
        </div>
        <p className="text-sm font-medium line-clamp-2">
          {d.title || d.questionText || (d.missing ? `Question ${d.questionId} no longer exists` : 'No question selected')}
        </p>
        {d.customNote && <p className="text-xs text-muted-foreground italic line-clamp-1">Note: {d.customNote}</p>}
      </CardContent>
      <Handle type="source" position={Position.Right} />
    </Card>
  );
}
