import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps } from '@xyflow/react';
import { cn } from '@/lib/utils';
import type { EdgeCondition } from '@/types/interviewFlow';

export function conditionLabel(condition: EdgeCondition | undefined): string {
  if (!condition || condition.type === 'default') return 'Default';
  if (condition.type === 'band') return condition.value[0].toUpperCase() + condition.value.slice(1);
  return condition.value;
}

const COLOR_BY_LABEL: Record<string, string> = {
  Strong: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
  Developing: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30',
  Weak: 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30',
  Default: 'bg-muted text-muted-foreground border-border',
};

export function ConditionEdge({
  id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data, selected, markerEnd,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });
  const label = conditionLabel(data?.condition as EdgeCondition | undefined);
  return (
    <>
      <BaseEdge id={id} path={edgePath} markerEnd={markerEnd} style={{ strokeWidth: selected ? 2.5 : 1.5 }} />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className={cn(
            'px-2 py-0.5 rounded-full text-[10px] font-semibold border whitespace-nowrap',
            COLOR_BY_LABEL[label] ?? COLOR_BY_LABEL.Default,
            selected && 'ring-2 ring-primary',
          )}
        >
          {label}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
