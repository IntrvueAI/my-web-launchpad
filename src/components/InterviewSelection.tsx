import { useState } from 'react';
import { getAllInterviewTypes, INTERVIEW_CATEGORIES, InterviewType } from '@/config/interviewTypes';
import { cn } from '@/lib/utils';
import { GraduationCap, Brain, Calculator, Globe, Timer, BookOpen, Sparkles, type LucideIcon } from 'lucide-react';
import { useCredits } from '@/hooks/useCredits';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

interface InterviewSelectionProps {
  onSelectInterview: (interviewType: InterviewType) => void;
}

// Which coach fronts each interview (falls back to Cara for anything unmapped).
const INTERVIEWER: Record<string, string> = {
  'maths-interview': 'Clara',
  'logic-puzzles': 'Clara',
  'current-affairs-interview': 'Nadia',
};
// Colour-block palette, cycled per card (mock 1b: coral / teal / gold).
const PALETTE = ['bg-primary', 'bg-teal', 'bg-gold'];
// Each interview's picture — a friendly subject icon (matches interviewTypes `icon`).
const ICONS: Record<string, LucideIcon> = { GraduationCap, Brain, Calculator, Globe, Timer, BookOpen };

const difficultyLabel = (level: number) =>
  level === 1 ? 'Beginner' : level === 2 ? 'Intermediate' : level === 3 ? 'Advanced' : 'All levels';

export const InterviewSelection = ({ onSelectInterview }: InterviewSelectionProps) => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const allInterviewTypes = getAllInterviewTypes();
  const { credits } = useCredits();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingInterview, setPendingInterview] = useState<InterviewType | null>(null);

  const filtered = allInterviewTypes.filter(
    (iv) => !selectedCategory || iv.category === selectedCategory,
  );

  const launch = (interview: InterviewType) => {
    const cost = interview.costCredits ?? 1;
    if (cost === 0 || (credits ?? 0) <= 0) {
      onSelectInterview(interview);
      return;
    }
    setPendingInterview(interview);
    setConfirmOpen(true);
  };

  return (
    <div className="container mx-auto max-w-6xl px-4 md:px-8 py-6 space-y-8">
      {/* Header + filter pills */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl md:text-[38px] font-semibold">What shall we practise today?</h1>
          <p className="mt-2.5 text-base text-muted-foreground">
            Pick a session — Pip recommends starting with what feels hardest.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <FilterPill active={selectedCategory === null} onClick={() => setSelectedCategory(null)}>All</FilterPill>
          {Object.entries(INTERVIEW_CATEGORIES).map(([key, category]) => (
            <FilterPill key={key} active={selectedCategory === key} onClick={() => setSelectedCategory(key)}>
              {category.name}
            </FilterPill>
          ))}
        </div>
      </div>

      {/* Interviewer cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 md:gap-[22px]">
        {filtered.map((interview, i) => {
          const interviewer = INTERVIEWER[interview.id] ?? 'Cara';
          const color = PALETTE[i % PALETTE.length];
          const isPick = filtered.length > 1 && i === filtered.length - 1;
          const badge = interview.id === '11-plus' || i === 0 ? '★ Most popular' : isPick ? "Pip's pick for you" : null;
          const pillText = color === 'bg-teal' ? 'text-[#1f6969]' : 'text-[#b0641f]';
          const Icon = ICONS[interview.icon || ''] || Sparkles;
          return (
            <div key={interview.id} className="flex flex-col rounded-[22px] border border-border bg-card overflow-hidden transition-transform hover:-translate-y-1">
              <div className={cn('relative h-[120px]', color)}>
                {badge && (
                  <span className="absolute top-4 right-4 rounded-full bg-white/25 px-3 py-[5px] text-[11.5px] font-bold text-white">
                    {badge}
                  </span>
                )}
                {/* Subject picture */}
                <Icon className="absolute right-6 bottom-6 h-14 w-14 text-white/85" strokeWidth={1.75} />
                <div className="absolute -bottom-[26px] left-[22px] flex h-14 w-14 items-center justify-center rounded-full border-4 border-card bg-secondary text-lg font-extrabold text-ink">
                  {interviewer.charAt(0)}
                </div>
              </div>
              <div className="flex flex-1 flex-col p-6 pt-[38px]">
                <div className="font-serif text-xl font-semibold">{interview.name}</div>
                <p className="mt-2 text-[13.5px] leading-[1.55] text-muted-foreground">{interview.description}</p>
                <div className="mt-3.5 flex flex-wrap gap-2">
                  <span className={cn('rounded-full bg-secondary px-[11px] py-[5px] text-[11.5px] font-bold', pillText)}>{interview.duration} min</span>
                  <span className={cn('rounded-full bg-secondary px-[11px] py-[5px] text-[11.5px] font-bold', pillText)}>{difficultyLabel(interview.difficultyLevel)}</span>
                </div>
                <button
                  onClick={() => launch(interview)}
                  className={cn(
                    'mt-[18px] w-full rounded-full py-3 text-sm font-bold transition-transform hover:-translate-y-0.5',
                    isPick ? 'bg-primary text-primary-foreground shadow-[0_6px_16px_hsl(var(--primary)/0.28)]' : 'bg-ink text-cream',
                  )}
                >
                  Start with {interviewer}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <p className="py-12 text-center text-muted-foreground">No sessions in this category yet.</p>
      )}

      {/* Confirm consume credit */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="mx-4 max-w-[calc(100vw-2rem)] md:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg">Use 1 credit to start?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm leading-relaxed">
              Starting this interview will deduct 1 credit from your balance. You currently have {credits ?? 0} credit{(credits ?? 0) === 1 ? '' : 's'}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
            <AlertDialogCancel className="w-full sm:w-auto min-h-[44px]">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="w-full sm:w-auto min-h-[44px]"
              onClick={() => {
                if (pendingInterview) {
                  onSelectInterview(pendingInterview);
                  setPendingInterview(null);
                }
                setConfirmOpen(false);
              }}
            >
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

function FilterPill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded-full px-[18px] py-[9px] text-[13px] font-semibold transition-colors',
        active ? 'bg-ink text-cream' : 'border border-foreground/15 text-muted-foreground hover:text-foreground',
      )}
    >
      {children}
    </button>
  );
}
