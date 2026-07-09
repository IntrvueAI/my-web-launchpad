import { useState } from 'react';
import { getAllInterviewTypes, INTERVIEW_CATEGORIES, InterviewType } from '@/config/interviewTypes';
import { cn } from '@/lib/utils';
import { useCredits } from '@/hooks/useCredits';
import { GraduationCap, Brain, Calculator, Globe, Timer, BookOpen, Sparkles, Search, Clock, Star, Play, type LucideIcon } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

interface InterviewSelectionProps {
  onSelectInterview: (interviewType: InterviewType) => void;
}

const ICONS: Record<string, LucideIcon> = { GraduationCap, Brain, Calculator, Globe, Timer, BookOpen };
// Accent (top bar + icon tint) per interview.
const ACCENT: Record<string, string> = {
  '11-plus': '#FF7F50', 'maths-interview': '#38BDF8', 'logic-puzzles': '#8B5CF6',
  'current-affairs-interview': '#34D399', demo: '#FBBF24',
};
const DIFF: Record<number, { label: string; cls: string }> = {
  1: { label: 'Beginner', cls: 'text-emerald' },
  2: { label: 'Intermediate', cls: 'text-amber' },
  3: { label: 'Advanced', cls: 'text-[#F87171]' },
};

export const InterviewSelection = ({ onSelectInterview }: InterviewSelectionProps) => {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const { credits } = useCredits();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, setPending] = useState<InterviewType | null>(null);
  const all = getAllInterviewTypes();

  const filtered = all.filter((iv) => {
    if (category && iv.category !== category) return false;
    if (!search) return true;
    const s = search.toLowerCase();
    return [iv.name, iv.description, ...(iv.tags || [])].some((v) => (v || '').toLowerCase().includes(s));
  });

  const launch = (iv: InterviewType) => {
    const cost = iv.costCredits ?? 1;
    if (cost === 0 || (credits ?? 0) <= 0) { onSelectInterview(iv); return; }
    setPending(iv); setConfirmOpen(true);
  };

  return (
    <div className="mx-auto max-w-[1120px] px-4 sm:px-6 py-6">
      <div className="text-center mb-5">
        <h1 className="font-display text-[28px] font-semibold text-white">Choose your interview</h1>
        <p className="mt-1.5 text-sm font-semibold text-muted-foreground">Pick what you&rsquo;d like to practise — each one earns XP!</p>
      </div>

      {/* Search */}
      <div className="relative mb-3.5">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search interviews by name, topic, or tag…"
          className="w-full rounded-2xl border border-white/10 bg-white/[0.04] py-3 pl-10 pr-4 text-sm font-semibold text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
        />
      </div>

      {/* Category chips */}
      <div className="flex gap-2.5 flex-wrap mb-5">
        <button onClick={() => setCategory(null)} className={cn('chip', category === null && 'chip-on')}>All</button>
        {Object.entries(INTERVIEW_CATEGORIES).map(([key, c]) => (
          <button key={key} onClick={() => setCategory(key)} className={cn('chip', category === key && 'chip-on')}>{c.name}</button>
        ))}
      </div>

      {/* Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((iv) => {
          const Icon = ICONS[iv.icon || ''] || Sparkles;
          const accent = ACCENT[iv.id] || '#FF7F50';
          const diff = DIFF[iv.difficultyLevel] || DIFF[2];
          const areas = iv.scoringCriteria || [];
          return (
            <div key={iv.id} className="tile p-0 overflow-hidden flex flex-col transition-transform hover:-translate-y-1">
              <div style={{ height: 4, background: accent }} />
              <div className="p-[18px] flex flex-col gap-3 flex-1">
                <div className="flex items-center gap-2.5">
                  <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: `${accent}26` }}>
                    <Icon className="h-5 w-5" style={{ color: accent }} />
                  </div>
                  <div className="font-extrabold text-[15px] text-white leading-tight">{iv.name}</div>
                </div>
                <p className="text-[12.5px] font-semibold text-muted-foreground leading-[1.5] line-clamp-2">{iv.description}</p>
                <div className="flex gap-1.5 flex-wrap">
                  <span className="text-[10.5px] font-extrabold text-[#AEB9D0] bg-white/5 px-2.5 py-[3px] rounded-full">{INTERVIEW_CATEGORIES[iv.category]?.name || iv.category}</span>
                  <span className={cn('text-[10.5px] font-extrabold px-2.5 py-[3px] rounded-full bg-white/5', diff.cls)}>● {diff.label}</span>
                </div>
                <div className="flex gap-4 text-[12px] font-bold text-muted-foreground">
                  <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> {iv.duration} min</span>
                  <span className="flex items-center gap-1.5 text-amber"><Star className="h-3.5 w-3.5 fill-current" /> up to {iv.duration * 8} XP</span>
                </div>
                {areas.length > 0 && (
                  <div>
                    <div className="text-[11px] font-extrabold text-[#7E8BA6] mb-1.5">ASSESSMENT AREAS</div>
                    <div className="flex gap-1.5 flex-wrap">
                      {areas.slice(0, 2).map((a) => (
                        <span key={a} className="text-[10.5px] font-bold text-[#C7D2E4] bg-white/5 px-2 py-[3px] rounded-lg">{a.split(' ').slice(0, 2).join(' ')}</span>
                      ))}
                      {areas.length > 2 && <span className="text-[10.5px] font-bold text-[#C7D2E4] bg-white/5 px-2 py-[3px] rounded-lg">+{areas.length - 2}</span>}
                    </div>
                  </div>
                )}
                <button
                  onClick={() => launch(iv)}
                  className="mt-auto flex items-center justify-center gap-2 w-full rounded-xl py-3 text-sm font-extrabold text-white transition-transform hover:-translate-y-0.5"
                  style={{ background: 'linear-gradient(135deg,#FF7F50,#F43F5E)' }}
                >
                  <Play className="h-3.5 w-3.5 fill-current" /> {iv.costCredits === 0 ? 'Try free' : 'Start interview'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && <p className="py-12 text-center text-muted-foreground">No interviews match your search.</p>}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="mx-4 max-w-[calc(100vw-2rem)] md:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg">Use 1 credit to start?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm leading-relaxed">
              Starting this interview will deduct 1 credit. You currently have {credits ?? 0} credit{(credits ?? 0) === 1 ? '' : 's'}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
            <AlertDialogCancel className="w-full sm:w-auto min-h-[44px]">Cancel</AlertDialogCancel>
            <AlertDialogAction className="w-full sm:w-auto min-h-[44px]" onClick={() => { if (pending) { onSelectInterview(pending); setPending(null); } setConfirmOpen(false); }}>
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
