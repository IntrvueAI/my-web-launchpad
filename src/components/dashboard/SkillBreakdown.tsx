import { BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DashboardStats } from '@/hooks/useDashboardStats';

const MAX_SKILL_SCORE = 5;

const SKILLS: { key: keyof DashboardStats['skills']; label: string; bar: string }[] = [
  { key: 'personalInsight', label: 'Personal Insight & Expression', bar: 'bg-amber' },
  { key: 'reasoning', label: 'Reasoning & Intellectual Agility', bar: 'bg-sky' },
  { key: 'extracurricular', label: 'Extracurricular Engagement', bar: 'bg-emerald' },
  { key: 'currentAwareness', label: 'Current Awareness & Curiosity', bar: 'bg-primary' },
];

/** Shared between Dashboard and the Feedback page's profile overview — same "Avg. across
 *  sessions" skill bars either way. */
export function SkillBreakdown({ stats }: { stats: DashboardStats | undefined }) {
  const skills = SKILLS.map((s) => ({ ...s, value: stats?.skills[s.key] ?? null })).filter(
    (s) => s.value !== null
  ) as (typeof SKILLS[number] & { value: number })[];

  return (
    <div className="tile p-5">
      <div className="flex items-center justify-between mb-3.5">
        <span className="font-display font-semibold text-[15px] text-white flex items-center gap-2"><BarChart3 className="h-4 w-4 text-sky" /> Skill breakdown</span>
        <span className="text-[10.5px] font-bold text-muted-foreground px-2.5 py-[3px] rounded-full border border-white/10">Avg. across sessions</span>
      </div>
      {skills.length === 0 ? (
        <p className="text-sm text-muted-foreground">Finish a session to see your skills grow!</p>
      ) : (
        <div className="flex flex-col gap-3">
          {skills.map((s) => (
            <div key={s.key}>
              <div className="flex justify-between text-xs font-bold mb-1.5">
                <span className="text-[#DCE4F2]">{s.label}</span>
                <span className="text-muted-foreground">{s.value}/5</span>
              </div>
              <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
                <div className={cn('h-full rounded-full', s.bar)} style={{ width: `${(s.value / MAX_SKILL_SCORE) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
