import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Check, X, Sparkles, RotateCcw } from 'lucide-react';
import { SectionCard } from './SectionCard';

interface DailyOption { key: string; text: string; correct: boolean; reasoning: string; }
interface DailyQuestion {
  id: string; active_date: string; subject?: string; title?: string;
  question: string; options: DailyOption[]; explanation?: string;
}

/** Question of the Day — a single MCQ that reveals per-option reasoning (why each is right/wrong). */
export function QuestionOfTheDay() {
  const [q, setQ] = useState<DailyQuestion | null>(null);
  const [picked, setPicked] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('daily_questions')
        .select('*')
        .order('active_date', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!data) return;
      setQ(data as unknown as DailyQuestion);
      const prev = localStorage.getItem(`qotd-${(data as any).active_date}`);
      if (prev) setPicked(prev);
    })();
  }, []);

  if (!q || !Array.isArray(q.options) || q.options.length === 0) return null;
  const answered = picked !== null;
  const correct = q.options.find((o) => o.key === picked)?.correct;
  const pick = (key: string) => {
    if (answered) return;
    setPicked(key);
    localStorage.setItem(`qotd-${q.active_date}`, key);
  };
  const retry = () => { setPicked(null); localStorage.removeItem(`qotd-${q.active_date}`); };

  return (
    <SectionCard
      icon={<Sparkles className="h-5 w-5" />}
      accent="primary"
      title="Question of the Day"
      subtitle={q.subject ? q.subject : 'A quick daily challenge'}
      right={<Badge variant="secondary" className="hidden sm:inline-flex text-[10px] uppercase tracking-wide">Daily</Badge>}
    >
      {q.title && <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{q.title}</p>}
      <p className="text-base font-medium leading-relaxed">{q.question}</p>

      <div className="grid gap-2.5">
        {q.options.map((opt) => {
          const isPicked = opt.key === picked;
          const showCorrect = answered && opt.correct;
          const showWrong = answered && isPicked && !opt.correct;
          return (
            <button
              key={opt.key}
              disabled={answered}
              onClick={() => pick(opt.key)}
              className={cn(
                'flex items-start gap-3 rounded-xl border p-3.5 text-left transition-all',
                !answered && 'hover:border-primary/60 hover:bg-accent hover:shadow-sm',
                showCorrect && 'border-green-500/60 bg-green-500/5',
                showWrong && 'border-red-500/60 bg-red-500/5',
                answered && !opt.correct && !isPicked && 'opacity-55',
              )}
            >
              <span className={cn(
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-xs font-bold',
                showCorrect && 'border-green-500 bg-green-500 text-white',
                showWrong && 'border-red-500 bg-red-500 text-white',
                !answered && 'text-muted-foreground',
              )}>
                {showCorrect ? <Check className="h-4 w-4" /> : showWrong ? <X className="h-4 w-4" /> : opt.key}
              </span>
              <span className="flex-1 space-y-1 pt-0.5">
                <span className="block text-sm font-medium">{opt.text}</span>
                {answered && (
                  <span className={cn('block text-xs leading-relaxed', opt.correct ? 'text-green-700' : 'text-muted-foreground')}>
                    {opt.reasoning}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      {answered && (
        <div className="flex items-start gap-3 rounded-xl bg-muted/50 p-3.5">
          <Badge className={cn('shrink-0', correct ? 'bg-green-500 hover:bg-green-500' : 'bg-red-500 hover:bg-red-500', 'text-white')}>
            {correct ? 'Correct!' : 'Not quite'}
          </Badge>
          <div className="flex-1 space-y-2">
            {q.explanation && <p className="text-sm text-muted-foreground leading-relaxed">{q.explanation}</p>}
            <Button variant="ghost" size="sm" onClick={retry} className="h-7 gap-1.5 px-2 text-xs text-muted-foreground">
              <RotateCcw className="h-3.5 w-3.5" /> Try again
            </Button>
          </div>
        </div>
      )}
    </SectionCard>
  );
}
