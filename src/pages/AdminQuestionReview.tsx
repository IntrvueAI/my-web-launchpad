import { useMemo, useState } from 'react';
import { useAdminStatus } from '@/hooks/useAdminStatus';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Check, Search } from 'lucide-react';

import maStaging from '@/data/minigames-staging/ma_staging.json';
import vrStaging from '@/data/minigames-staging/vr_staging.json';
import enStaging from '@/data/minigames-staging/en_staging.json';

interface StagedQuestion {
  subject: string;
  topic: string;
  difficulty: string;
  question: string;
  options: string[];
  answer: string;
  explanation: string;
  id: string;
  passage_id?: string;
  passage_title?: string;
  passage?: string;
}

const ALL: StagedQuestion[] = [...(maStaging as StagedQuestion[]), ...(vrStaging as StagedQuestion[]), ...(enStaging as StagedQuestion[])];
const SUBJECTS = ['All', 'Maths', 'Verbal reasoning', 'English comprehension'] as const;
const PAGE_SIZE = 30;

/**
 * Read-only review of the overnight batch of 300+ new Quick Practice questions, staged in
 * src/data/minigames-staging/ rather than the live src/data/minigames/*.json — nothing here is
 * wired into MinigameService, so none of it is reachable by real users until someone reviews it
 * and merges the approved ones into the live files by hand.
 *
 * Maths (fully computed, not hand-typed) and the mechanical verbal-reasoning types (anagrams,
 * codes, letter sequences, days/time logic, hidden words) were generated and verified
 * programmatically. Synonyms/antonyms/analogies and the English comprehension passages were
 * hand-written and cross-checked against the passage text. Non-verbal reasoning (SVG-based) was
 * deliberately skipped this round — no way to visually verify the shapes render correctly without
 * a rendering/screenshot step, and a wrong visual-logic question is worse than no new one.
 */
export default function AdminQuestionReview() {
  const { isAdmin, isLoading } = useAdminStatus();
  const [subject, setSubject] = useState<(typeof SUBJECTS)[number]>('All');
  const [query, setQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const counts = useMemo(() => {
    const c: Record<string, number> = { Maths: 0, 'Verbal reasoning': 0, 'English comprehension': 0 };
    ALL.forEach((q) => { c[q.subject] = (c[q.subject] ?? 0) + 1; });
    return c;
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ALL.filter((item) => {
      if (subject !== 'All' && item.subject !== subject) return false;
      if (!q) return true;
      return (
        item.question.toLowerCase().includes(q) ||
        item.topic.toLowerCase().includes(q) ||
        (item.passage_title ?? '').toLowerCase().includes(q)
      );
    });
  }, [subject, query]);

  const visible = filtered.slice(0, visibleCount);

  // Group English by passage so each passage's text renders once, not once per question.
  const englishGroups = useMemo(() => {
    if (subject !== 'English comprehension' && subject !== 'All') return null;
    const groups = new Map<string, StagedQuestion[]>();
    visible.filter((q) => q.subject === 'English comprehension').forEach((q) => {
      const key = q.passage_id ?? q.passage_title ?? 'unknown';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(q);
    });
    return groups;
  }, [visible, subject]);

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

  const nonEnglishVisible = visible.filter((q) => q.subject !== 'English comprehension');

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-2xl font-bold mb-1">Question review — overnight batch</h1>
        <p className="text-muted-foreground mb-4">
          {ALL.length} new Quick Practice questions, staged for review. Nothing here is live —
          tell me which ones (or which topics) to merge into the real question bank and I'll wire them in.
        </p>

        <div className="flex flex-wrap gap-2 mb-4">
          {SUBJECTS.map((s) => (
            <button
              key={s}
              onClick={() => { setSubject(s); setVisibleCount(PAGE_SIZE); }}
              className={cn(
                'px-3 py-1.5 rounded-full text-sm font-medium border transition-colors',
                subject === s ? 'bg-primary text-primary-foreground border-primary' : 'bg-card hover:bg-muted border-border'
              )}
            >
              {s} {s !== 'All' && <span className="opacity-70">({counts[s] ?? 0})</span>}
              {s === 'All' && <span className="opacity-70">({ALL.length})</span>}
            </button>
          ))}
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => { setQuery(e.target.value); setVisibleCount(PAGE_SIZE); }}
            placeholder="Search by question text or topic…"
            className="pl-9"
          />
        </div>

        <div className="space-y-4">
          {nonEnglishVisible.map((q) => (
            <QuestionCard key={q.id} q={q} />
          ))}

          {englishGroups && [...englishGroups.entries()].map(([passageId, qs]) => (
            <Card key={passageId} className="overflow-hidden">
              <CardContent className="p-5 space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-xs">{passageId}</Badge>
                    <h3 className="font-semibold">{qs[0].passage_title}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed border-l-2 border-border pl-3">
                    {qs[0].passage}
                  </p>
                </div>
                <div className="space-y-3 pt-2 border-t">
                  {qs.map((q) => <QuestionCard key={q.id} q={q} compact />)}
                </div>
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

function QuestionCard({ q, compact = false }: { q: StagedQuestion; compact?: boolean }) {
  return (
    <Card className={compact ? 'border-none shadow-none bg-muted/30' : undefined}>
      <CardContent className={compact ? 'p-3' : 'p-5'}>
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <Badge variant="secondary" className="text-xs">{q.topic}</Badge>
          <Badge variant="outline" className="text-xs">{q.difficulty}</Badge>
          <span className="text-xs text-muted-foreground font-mono ml-auto">{q.id}</span>
        </div>
        <p className="font-medium mb-3">{q.question}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
          {q.options.map((opt) => (
            <div
              key={opt}
              className={cn(
                'flex items-center gap-2 rounded-lg border px-3 py-2 text-sm',
                opt === q.answer ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-medium' : 'border-border'
              )}
            >
              {opt === q.answer && <Check className="h-3.5 w-3.5 flex-none" />}
              <span className="break-words">{opt}</span>
            </div>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">{q.explanation}</p>
      </CardContent>
    </Card>
  );
}
