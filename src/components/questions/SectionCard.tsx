import { ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

type Accent = 'primary' | 'orange' | 'amber';

const CHIP: Record<Accent, string> = {
  primary: 'bg-primary/10 text-primary',
  orange: 'bg-orange-500/10 text-orange-500',
  amber: 'bg-amber-500/10 text-amber-600',
};

/**
 * Shared shell for the Questions-page sections so they read as one consistent set:
 * a tinted icon chip, title/subtitle, optional right-hand slot, and optional collapse.
 */
export function SectionCard({
  icon, accent = 'primary', title, subtitle, right, children,
  collapsible = false, open = true, onToggle, className,
}: {
  icon: ReactNode; accent?: Accent; title: string; subtitle?: string; right?: ReactNode;
  children: ReactNode; collapsible?: boolean; open?: boolean; onToggle?: () => void; className?: string;
}) {
  const Header = (
    <div className="flex items-center gap-3">
      <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', CHIP[accent])}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="text-base font-semibold leading-tight">{title}</h3>
        {subtitle && <p className="text-sm text-muted-foreground truncate">{subtitle}</p>}
      </div>
      {right}
      {collapsible && (
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')} />
      )}
    </div>
  );

  return (
    <Card className={cn('rounded-2xl border-border/60 shadow-sm', className)}>
      {collapsible ? (
        <button type="button" onClick={onToggle} className="w-full p-5 text-left hover:bg-muted/30 rounded-2xl transition-colors">
          {Header}
        </button>
      ) : (
        <div className="p-5 pb-0">{Header}</div>
      )}
      {open && <div className="p-5 pt-4 space-y-4">{children}</div>}
    </Card>
  );
}
