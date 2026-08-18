import { useState } from 'react';
import { getAllInterviewTypes, INTERVIEW_CATEGORIES, InterviewType } from '@/config/interviewTypes';
import { cn } from '@/lib/utils';
import { useCredits } from '@/hooks/useCredits';
import { GraduationCap, Brain, Calculator, Globe, Timer, BookOpen, Sparkles, Clock, MessageCircle, type LucideIcon } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

interface InterviewSelectionProps {
  onSelectInterview: (interviewType: InterviewType) => void;
}

const ICONS: Record<string, LucideIcon> = { GraduationCap, Brain, Calculator, Globe, Timer, BookOpen, MessageCircle };
const ACCENT: Record<string, string> = {
  '11-plus': '#FF7F50', 'maths-interview': '#38BDF8', 'logic-puzzles': '#8B5CF6',
  'current-affairs-interview': '#34D399', demo: '#FBBF24', 'chat-with-clara': '#F472B6',
};
const DIFF: Record<number, { label: string; cls: string }> = {
  1: { label: 'Beginner', cls: 'text-emerald' },
  2: { label: 'Intermediate', cls: 'text-amber' },
  3: { label: 'Advanced', cls: 'text-[#F87171]' },
};

export const InterviewSelection = ({ onSelectInterview }: InterviewSelectionProps) => {
  const [category, setCategory] = useState<string | null>(null);
  const { credits } = useCredits();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, setPending] = useState<InterviewType | null>(null);
  const all = getAllInterviewTypes();

  const filtered = all.filter((iv) => !category || iv.category === category);

  const launch = (iv: InterviewType) => {
    const cost = iv.costCredits ?? 1;
    if (cost === 0 || (credits ?? 0) <= 0) { onSelectInterview(iv); return; }
    setPending(iv); setConfirmOpen(true);
  };

  return (
    <div className="mx-auto max-w-[1000px] px-4 sm:px-6 py-8">
      <div className="mb-6">
        <h1 className="font-display text-[26px] font-semibold text-white">Choose your interview</h1>
        <p className="mt-1.5 text-sm font-semibold text-muted-foreground">Pick a session to practise.</p>
      </div>

      {/* Category chips */}
      <div className="flex gap-2 flex-wrap mb-6">
        <button onClick={() => setCategory(null)} className={cn('chip', category === null && 'chip-on')}>All</button>
        {Object.entries(INTERVIEW_CATEGORIES).map(([key, c]) => (
          <button key={key} onClick={() => setCategory(key)} className={cn('chip', category === key && 'chip-on')}>{c.name}</button>
        ))}
      </div>

      {/* Clean, minimal card grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        {filtered.map((iv) => {
          const Icon = ICONS[iv.icon || ''] || Sparkles;
          const accent = ACCENT[iv.id] || '#FF7F50';
          const diff = DIFF[iv.difficultyLevel] || DIFF[2];
          return (
            <div key={iv.id} className="tile p-5 flex flex-col gap-3.5">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-xl flex items-center justify-center flex-none" style={{ background: `${accent}22` }}>
                  <Icon className="h-5 w-5" style={{ color: accent }} />
                </div>
                <div className="min-w-0">
                  <div className="font-display text-[16px] font-semibold text-white leading-tight">{iv.name}</div>
                  <div className="flex items-center gap-2.5 mt-0.5 text-[12px] font-bold text-muted-foreground">
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {iv.duration} min</span>
                    <span className={diff.cls}>{diff.label}</span>
                  </div>
                </div>
              </div>
              <p className="text-[13px] font-semibold text-muted-foreground leading-[1.5]">{iv.description}</p>
              <button
                onClick={() => launch(iv)}
                className="mt-auto w-full rounded-xl bg-primary py-2.5 text-sm font-extrabold text-white transition-opacity hover:opacity-90"
              >
                {iv.costCredits === 0 ? 'Try free' : 'Start interview'}
              </button>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && <p className="py-12 text-center text-muted-foreground">No interviews in this category.</p>}

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
