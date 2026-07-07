import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Check, X, Sparkles, RotateCcw, Star } from 'lucide-react';
import { SectionCard } from './SectionCard';
import { Pip } from '@/components/brand/Pip';
import { cheer, encourage, addStar } from '@/lib/kid';

interface DailyOption { key: string; text: string; correct: boolean; reasoning: string; }
interface DailyQuestion {
  id: string; active_date: string; subject?: string; title?: string;
  question: string; options: DailyOption[]; explanation?: string;
}

/** Question of the Day — a playful daily MCQ that reveals per-option reasoning and cheers you on. */
export function QuestionOfTheDay({ name = 'superstar' }: { name?: string }) {
  const [q, setQ] = useState<DailyQuestion | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [message, setMessage] = useState<string>('');

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
    const isRight = q.options.find((o) => o.key === key)?.correct;
    setMessage(isRight ? cheer(name) : encourage(name));
    if (isRight && !localStorage.getItem(`qotd-star-${q.active_date}`)) {
      localStorage.setItem(`qotd-star-${q.active_date}`, '1');
      addStar();
    }
  };
  const retry = () => {
    setPicked(null);
    setMessage('');
    localStorage.removeItem(`qotd-${q.active_date}`);
  };

  return (
    <SectionCard
      icon={<Sparkles className="h-5 w-5" />}
      accent="primary"
      title="Question of the Day"
      subtitle={q.subject ? `Today's ${q.subject} puzzle` : 'A quick daily challenge'}
      right={<span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-gold/15 px-2.5 py-1 text-[11px] font-bold text-[#b0641f]"><Star className="h-3 w-3 fill-current" /> Earn a star</span>}
    >
      {q.title && <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{q.title}</p>}
      <p className="text-lg font-medium leading-relaxed">{q.question}</p>

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
                'flex items-start gap-3 rounded-2xl border-2 p-3.5 text-left transition-all',
                !answered && 'hover:border-primary/60 hover:bg-accent hover:-translate-y-0.5',
                showCorrect && 'border-teal bg-teal/5',
                showWrong && 'border-red-500/60 bg-red-500/5',
                answered && !opt.correct && !isPicked && 'opacity-55',
                !answered && 'border-border',
              )}
            >
              <span className={cn(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border-2 text-sm font-extrabold',
                showCorrect && 'border-teal bg-teal text-white',
                showWrong && 'border-red-500 bg-red-500 text-white',
                !answered && 'border-border text-muted-foreground',
                answered && !opt.correct && !isPicked && 'border-border text-muted-foreground',
              )}>
                {showCorrect ? <Check className="h-4 w-4" /> : showWrong ? <X className="h-4 w-4" /> : opt.key}
              </span>
              <span className="flex-1 space-y-1 pt-0.5">
                <span className="block text-[15px] font-medium">{opt.text}</span>
                {answered && (
                  <span className={cn('block text-xs leading-relaxed', opt.correct ? 'text-teal' : 'text-muted-foreground')}>
                    {opt.reasoning}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      {answered && (
        <div className={cn('flex items-center gap-3 rounded-2xl p-4', correct ? 'bg-teal/10' : 'bg-gold/10')}>
          <Pip size={44} />
          <div className="flex-1">
            <p className="font-serif text-lg font-semibold leading-tight">{message}</p>
            <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
              {correct ? (q.explanation || 'You nailed it. Come back tomorrow for a new one!') : (q.explanation || "That's how you learn — take a look at the green one above.")}
            </p>
            <Button variant="ghost" size="sm" onClick={retry} className="mt-1.5 h-7 gap-1.5 px-2 text-xs text-muted-foreground">
              <RotateCcw className="h-3.5 w-3.5" /> Try again
            </Button>
          </div>
          {correct && <Star className="h-6 w-6 shrink-0 fill-gold text-gold" />}
        </div>
      )}
    </SectionCard>
  );
}
