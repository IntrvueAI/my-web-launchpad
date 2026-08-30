import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Flag } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface EndNodeData {
  closingNote?: string;
  [key: string]: unknown;
}

export function EndNode({ data, selected }: NodeProps) {
  const d = data as EndNodeData;
  return (
    <div className={cn('rounded-lg bg-muted border px-4 py-3 text-sm max-w-[220px] shadow-md', selected && 'ring-2 ring-primary')}>
      <Handle type="target" position={Position.Left} />
      <div className="flex items-center gap-2 font-semibold">
        <Flag className="h-3.5 w-3.5" /> End
      </div>
      {d.closingNote && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{d.closingNote}</p>}
    </div>
  );
}
