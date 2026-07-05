import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';

interface ReviewItem {
  index: number; topic?: string; question: string; skipped?: boolean;
  outcome?: string; band?: string | null; your_answer?: string; note?: string;
}

const WRONG = new Set(['incorrect', 'stuck', 'incomplete']);
const isWrong = (r: ReviewItem) => !r.skipped && (WRONG.has(r.outcome || '') || r.band === 'weak');

/** "What you got wrong last time — and why", pulled from the most recent interview's review log. */
export function WrongLastTime({ onViewHistory }: { onViewHistory?: () => void }) {
  const { user } = useAuth();
  const [items, setItems] = useState<ReviewItem[] | null>(null);
  const [type, setType] = useState<string>('');
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from('feedback')
        .select('interview_type, questions_review, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      const review = ((data as any)?.questions_review ?? []) as ReviewItem[];
      setType((data as any)?.interview_type || '');
      setItems(review);
    })();
  }, [user]);

  if (!items) return null;
  const wrong = items.filter(isWrong);
  const skipped = items.filter((r) => r.skipped);
  if (wrong.length === 0 && skipped.length === 0) return null;

  return (
    <Card className="border-amber-500/40">
      <CardHeader className="cursor-pointer" onClick={() => setOpen((o) => !o)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            <div>
              <CardTitle className="text-lg">Review from last time</CardTitle>
              <CardDescription>
                {wrong.length} to revisit{skipped.length ? ` · ${skipped.length} skipped` : ''}
                {type ? ` · ${type.replace(/-/g, ' ')}` : ''}
              </CardDescription>
            </div>
          </div>
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </CardHeader>
      {open && (
        <CardContent className="space-y-3">
          {wrong.map((r) => (
            <div key={r.index} className="rounded-lg border bg-muted/30 p-3 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="text-[10px]">Q{r.index}</Badge>
                {r.topic && <Badge variant="secondary" className="text-[10px]">{r.topic}</Badge>}
                {r.outcome && <Badge className="text-[10px] bg-amber-500/15 text-amber-700 border-amber-500/30">{r.outcome.replace(/_/g, ' ')}</Badge>}
              </div>
              <p className="text-sm font-medium">{r.question}</p>
              {r.your_answer && <p className="text-xs text-muted-foreground">You said: “{r.your_answer}”</p>}
              {r.note && <p className="text-sm"><span className="font-semibold">Why: </span>{r.note}</p>}
            </div>
          ))}
          {skipped.map((r) => (
            <div key={`s-${r.index}`} className="rounded-lg border border-dashed p-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px]">Q{r.index}</Badge>
                <Badge variant="outline" className="text-[10px]">skipped</Badge>
                {r.topic && <span className="text-xs text-muted-foreground">{r.topic}</span>}
              </div>
              <p className="text-sm mt-1">{r.question}</p>
            </div>
          ))}
          {onViewHistory && (
            <Button variant="ghost" size="sm" onClick={onViewHistory} className="w-full">
              See the full transcript &amp; feedback
            </Button>
          )}
        </CardContent>
      )}
    </Card>
  );
}
