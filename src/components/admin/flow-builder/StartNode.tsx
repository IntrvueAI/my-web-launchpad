import { Handle, Position } from '@xyflow/react';
import { Play } from 'lucide-react';

export function StartNode() {
  return (
    <div className="rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold flex items-center gap-2 shadow-md">
      <Play className="h-3.5 w-3.5" /> Start
      <Handle type="source" position={Position.Right} className="!bg-primary-foreground !border-primary" />
    </div>
  );
}
