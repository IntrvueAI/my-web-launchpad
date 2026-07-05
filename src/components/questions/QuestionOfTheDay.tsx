import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Check, X, Sparkles } from 'lucide-react';

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
  const pick = (key: string) => {
    if (answered) return;
    setPicked(key);
    localStorage.setItem(`qotd-${q.active_date}`, key);
  };

  return (
    <Card className="border-primary/30">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <div>
            <CardTitle className="text-lg">Question of the Day</CardTitle>
            <CardDescription>
              {q.title || 'Give it a go'}{q.subject ? ` · ${q.subject}` : ''}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-base font-medium">{q.question}</p>
        <div className="grid gap-2">
          {q.options.map((opt) => {
            const isPicked = opt.key === picked;
            const reveal = answered;
            return (
              <button
                key={opt.key}
                disabled={answered}
                onClick={() => pick(opt.key)}
                className={cn(
                  'rounded-lg border p-3 text-left transition-colors',
                  !answered && 'hover:border-primary hover:bg-accent',
                  reveal && opt.correct && 'border-green-500 bg-green-500/10',
                  reveal && isPicked && !opt.correct && 'border-red-500 bg-red-500/10',
                  reveal && !opt.correct && !isPicked && 'opacity-70',
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="text-sm"><span className="font-semibold mr-2">{opt.key}.</span>{opt.text}</span>
                  {reveal && opt.correct && <Check className="h-4 w-4 shrink-0 text-green-600" />}
                  {reveal && isPicked && !opt.correct && <X className="h-4 w-4 shrink-0 text-red-600" />}
                </div>
                {reveal && (
                  <p className={cn('mt-2 text-xs', opt.correct ? 'text-green-700' : 'text-muted-foreground')}>
                    {opt.reasoning}
                  </p>
                )}
              </button>
            );
          })}
        </div>
        {answered && (
          <div className="rounded-lg bg-muted/50 p-3 text-sm">
            <Badge className="mb-2" variant={q.options.find((o) => o.key === picked)?.correct ? 'default' : 'destructive'}>
              {q.options.find((o) => o.key === picked)?.correct ? 'Correct!' : 'Not quite'}
            </Badge>
            {q.explanation && <p className="text-muted-foreground">{q.explanation}</p>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
