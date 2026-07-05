import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Flame, ChevronDown, ChevronUp, Eye, RotateCcw } from 'lucide-react';

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
    <Card className="border-orange-500/30">
      <CardHeader className="cursor-pointer" onClick={() => setOpen((o) => !o)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-500" />
            <div>
              <CardTitle className="text-lg">Warm up</CardTitle>
              <CardDescription>Optional — a few quick questions to get your brain going.</CardDescription>
            </div>
          </div>
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </CardHeader>

      {open && (
        <CardContent className="space-y-4">
          {!questions && (
            <>
              <p className="text-sm text-muted-foreground">Pick a topic to start a 5-question warm-up.</p>
              <div className="flex flex-wrap gap-2">
                {SUBJECTS.map((s) => (
                  <Button key={s.key} variant="outline" size="sm" disabled={loading} onClick={() => start(s.key)}>
                    {s.label}
                  </Button>
                ))}
              </div>
              {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
              {error && <p className="text-sm text-destructive">{error}</p>}
            </>
          )}

          {current && (
            <div className="space-y-4">
              <div className="space-y-1">
                <Progress value={((index + 1) / questions!.length) * 100} />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Question {index + 1} of {questions!.length}</span>
                  <div className="flex gap-1">
                    {current.topic && <Badge variant="secondary" className="text-[10px]">{current.topic}</Badge>}
                    <span className="text-yellow-500">{stars(current.difficulty)}</span>
                  </div>
                </div>
              </div>

              <Card className="p-4 space-y-3">
                {current.title && <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{current.title}</p>}
                <p className="text-base font-medium">{current.question}</p>

                {!revealed ? (
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => setRevealed(true)} className="gap-2"><Eye className="h-4 w-4" /> Reveal answer</Button>
                    {current.firstHint && <span className="text-xs text-muted-foreground self-center">Stuck? Hint: {current.firstHint}</span>}
                  </div>
                ) : (
                  <div className="space-y-2 rounded-lg bg-muted/50 p-3 text-sm">
                    {current.answer && <p><span className="font-semibold">Answer: </span>{current.answer}</p>}
                    {current.modelReasoningPath && (
                      <p className="text-muted-foreground"><span className="font-semibold text-foreground">How to get there: </span>{current.modelReasoningPath}</p>
                    )}
                  </div>
                )}
              </Card>

              <div className="flex gap-2">
                {index + 1 < questions!.length ? (
                  <Button onClick={() => { setIndex((i) => i + 1); setRevealed(false); }}>Next question</Button>
                ) : (
                  <Button onClick={reset} className="gap-2"><RotateCcw className="h-4 w-4" /> Done — new warm-up</Button>
                )}
                <Button variant="ghost" onClick={reset}>Stop</Button>
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
