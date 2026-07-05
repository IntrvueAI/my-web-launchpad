import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { Flame, Eye, RotateCcw } from 'lucide-react';
import { SectionCard } from './SectionCard';

interface WarmUpQuestion {
  id: string; subject: string; topic?: string; questionType?: string;
  difficulty: number; title?: string; question: string;
  answer?: string; modelReasoningPath?: string; firstHint?: string | null;
}

const SUBJECTS = [
  { key: 'mixed', label: 'Mixed' },
  { key: 'maths', label: 'Maths' },
  { key: 'logic', label: 'Logic' },
  { key: 'currentaffairs', label: 'Current Affairs' },
];
const stars = (n: number) => '★'.repeat(Math.max(0, n));

/** Optional, self-paced warm-up drawn from the real interview bank. Think it through, then reveal. */
export function WarmUp() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<WarmUpQuestion[] | null>(null);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = async (subject: string) => {
    setLoading(true); setError(null);
    const { data, error } = await supabase.functions.invoke('warmup-questions', { body: { subject, limit: 5 } });
    setLoading(false);
    if (error || !data?.questions?.length) { setError('Could not load warm-up questions. Try again.'); return; }
    setQuestions(data.questions); setIndex(0); setRevealed(false);
  };

  const reset = () => { setQuestions(null); setIndex(0); setRevealed(false); setError(null); };
  const current = questions?.[index];

  return (
    <SectionCard
      icon={<Flame className="h-5 w-5" />}
      accent="orange"
      title="Warm up"
      subtitle="Optional — a few quick questions to get going"
      collapsible
      open={open}
      onToggle={() => setOpen((o) => !o)}
    >
      {!questions ? (
        <>
          <p className="text-sm text-muted-foreground">Pick a topic to start a 5-question warm-up.</p>
          <div className="flex flex-wrap gap-2">
            {SUBJECTS.map((s) => (
              <Button key={s.key} variant="outline" size="sm" disabled={loading} onClick={() => start(s.key)} className="rounded-full">
                {s.label}
              </Button>
            ))}
          </div>
          {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {error && <p className="text-sm text-destructive">{error}</p>}
        </>
      ) : current ? (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Progress value={((index + 1) / questions.length) * 100} className="h-1.5" />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Question {index + 1} of {questions.length}</span>
              <div className="flex items-center gap-1.5">
                {current.topic && <Badge variant="secondary" className="text-[10px]">{current.topic}</Badge>}
                <span className="text-amber-500">{stars(current.difficulty)}</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border bg-muted/20 p-4 space-y-3">
            {current.title && <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{current.title}</p>}
            <p className="text-base font-medium leading-relaxed">{current.question}</p>

            {!revealed ? (
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" onClick={() => setRevealed(true)} className="gap-2"><Eye className="h-4 w-4" /> Reveal answer</Button>
                {current.firstHint && <span className="text-xs text-muted-foreground">Stuck? Hint: {current.firstHint}</span>}
              </div>
            ) : (
              <div className="space-y-2 rounded-lg border bg-background p-3 text-sm">
                {current.answer && <p><span className="font-semibold">Answer: </span>{current.answer}</p>}
                {current.modelReasoningPath && (
                  <p className="text-muted-foreground leading-relaxed"><span className="font-semibold text-foreground">How to get there: </span>{current.modelReasoningPath}</p>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {index + 1 < questions.length ? (
              <Button onClick={() => { setIndex((i) => i + 1); setRevealed(false); }}>Next question</Button>
            ) : (
              <Button onClick={reset} className="gap-2"><RotateCcw className="h-4 w-4" /> New warm-up</Button>
            )}
            <Button variant="ghost" onClick={reset} className="text-muted-foreground">Stop</Button>
          </div>
        </div>
      ) : null}
    </SectionCard>
  );
}
