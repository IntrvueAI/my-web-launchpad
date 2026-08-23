import { useMemo, useState } from 'react';
import { useAdminStatus } from '@/hooks/useAdminStatus';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Search } from 'lucide-react';

import elevenplusStaging from '@/data/interview-staging/elevenplus.json';
import logicStaging from '@/data/interview-staging/logic.json';
import mathsStaging from '@/data/interview-staging/maths.json';
import currentaffairsStaging from '@/data/interview-staging/currentaffairs.json';

interface StagedInterviewQuestion {
  id: string;
  subject: string;
  topic: string;
  difficulty: number;
  questionType?: string;
  title?: string;
  tags?: string[];
  question: string;
  answer: string;
  modelReasoningPath?: string;
}

const ALL: StagedInterviewQuestion[] = [
  ...(elevenplusStaging as StagedInterviewQuestion[]),
  ...(logicStaging as StagedInterviewQuestion[]),
  ...(mathsStaging as StagedInterviewQuestion[]),
  ...(currentaffairsStaging as StagedInterviewQuestion[]),
];

const SUBJECTS = ['All', 'elevenplus', 'logic', 'maths', 'currentaffairs'] as const;
const SUBJECT_LABELS: Record<string, string> = {
  elevenplus: '11+',
  logic: 'Logic',
  maths: 'Maths',
  currentaffairs: 'Current affairs',
};
const PAGE_SIZE = 30;

/**
 * Read-only review of a new thought-provoking / problem-solving interview question batch,
 * staged in src/data/interview-staging/ and NOT wired into the live interview bank
 * (src/interview/bank/questions/) or reachable by real users. Medicine was intentionally
 * excluded from this batch per the brief. Once reviewed, approved questions get merged into
 * the live bank under src/interview/bank/questions/<subject>/<topic>/<difficulty>.json.
 */
export default function AdminInterviewQuestionReview() {
  const { isAdmin, isLoading } = useAdminStatus();
  const [subject, setSubject] = useState<(typeof SUBJECTS)[number]>('All');
  const [topic, setTopic] = useState<string>('All');
  const [query, setQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    ALL.forEach((q) => { c[q.subject] = (c[q.subject] ?? 0) + 1; });
    return c;
  }, []);

  const topics = useMemo(() => {
    const t = new Set<string>();
    ALL.forEach((q) => { if (subject === 'All' || q.subject === subject) t.add(q.topic); });
    return ['All', ...Array.from(t).sort()];
  }, [subject]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ALL.filter((item) => {
      if (subject !== 'All' && item.subject !== subject) return false;
      if (topic !== 'All' && item.topic !== topic) return false;
      if (!q) return true;
      return (
        item.question.toLowerCase().includes(q) ||
        item.topic.toLowerCase().includes(q) ||
        (item.title ?? '').toLowerCase().includes(q)
      );
    });
  }, [subject, topic, query]);

  const visible = filtered.slice(0, visibleCount);

  const toggleReveal = (id: string) => {
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4 text-center">
        <p className="text-muted-foreground">Admin access required.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-2xl font-bold mb-1">Interview question review — thought-provoking batch</h1>
        <p className="text-muted-foreground mb-4">
          {ALL.length} new questions staged for the 11+, logic, maths and current-affairs interviews.
          Medicine was excluded. Nothing below is live — approved questions get merged into the real
          interview bank by hand.
        </p>

        <div className="flex flex-wrap gap-2 mb-3">
          {SUBJECTS.map((s) => (
            <button
              key={s}
              onClick={() => { setSubject(s); setTopic('All'); setVisibleCount(PAGE_SIZE); }}
              className={cn(
                'px-3 py-1.5 rounded-full text-sm font-medium border transition-colors',
                subject === s ? 'bg-primary text-primary-foreground border-primary' : 'bg-card hover:bg-muted border-border'
              )}
            >
              {s === 'All' ? 'All' : SUBJECT_LABELS[s]}{' '}
              <span className="opacity-70">({s === 'All' ? ALL.length : counts[s] ?? 0})</span>
            </button>
          ))}
        </div>

        {topics.length > 1 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {topics.map((t) => (
              <button
                key={t}
                onClick={() => { setTopic(t); setVisibleCount(PAGE_SIZE); }}
                className={cn(
                  'px-2.5 py-1 rounded-full text-xs font-medium border transition-colors',
                  topic === t ? 'bg-secondary text-secondary-foreground border-secondary' : 'bg-card hover:bg-muted border-border text-muted-foreground'
                )}
              >
                {t}
              </button>
            ))}
          </div>
        )}

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => { setQuery(e.target.value); setVisibleCount(PAGE_SIZE); }}
            placeholder="Search by question text, title or topic…"
            className="pl-9"
          />
        </div>

        <div className="space-y-4">
          {visible.map((q) => (
            <Card key={q.id}>
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <Badge variant="outline" className="text-xs">{SUBJECT_LABELS[q.subject] ?? q.subject}</Badge>
                  <Badge variant="secondary" className="text-xs">{q.topic}</Badge>
                  <Badge variant="outline" className="text-xs">difficulty {q.difficulty}</Badge>
                  <span className="text-xs text-muted-foreground font-mono ml-auto">{q.id}</span>
                </div>
                {q.title && <p className="text-sm font-semibold text-muted-foreground mb-1">{q.title}</p>}
                <p className="font-medium mb-3 whitespace-pre-line leading-relaxed">{q.question}</p>

                {revealed.has(q.id) ? (
                  <div className="space-y-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3">
                    <p className="text-sm"><span className="font-semibold text-emerald-700 dark:text-emerald-400">Answer / assessment: </span>{q.answer}</p>
                    {q.modelReasoningPath && (
                      <p className="text-sm text-muted-foreground"><span className="font-semibold text-foreground">Model reasoning path: </span>{q.modelReasoningPath}</p>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => toggleReveal(q.id)}>Hide</Button>
                  </div>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => toggleReveal(q.id)}>Reveal answer & reasoning</Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {filtered.length === 0 && (
          <p className="text-center text-muted-foreground py-12">No questions match this filter.</p>
        )}

        {visibleCount < filtered.length && (
          <div className="flex justify-center mt-6">
            <Button variant="outline" onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}>
              Show more ({filtered.length - visibleCount} remaining)
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
