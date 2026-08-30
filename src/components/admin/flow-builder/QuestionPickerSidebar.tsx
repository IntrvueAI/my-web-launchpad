import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';

const db = () => (supabase as any).from('questions');

export interface PickerQuestion {
  id: string;
  subject: string;
  topic: string;
  title: string | null;
  question: string;
  difficulty: number;
}

interface QuestionPickerSidebarProps {
  /** Fires when the admin starts dragging a question card — used to populate the drop payload. */
  onDragStartQuestion: (q: PickerQuestion, e: React.DragEvent) => void;
}

export function QuestionPickerSidebar({ onDragStartQuestion }: QuestionPickerSidebarProps) {
  const [questions, setQuestions] = useState<PickerQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState('All');
  const [query, setQuery] = useState('');

  useEffect(() => {
    (async () => {
      const { data, error } = await db()
        .select('id, subject, topic, title, question, difficulty')
        .eq('active', true)
        .order('subject')
        .order('topic');
      if (!error) setQuestions((data ?? []) as PickerQuestion[]);
      setLoading(false);
    })();
  }, []);

  const subjects = useMemo(() => ['All', ...Array.from(new Set(questions.map((q) => q.subject)))], [questions]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return questions.filter((item) => {
      if (subject !== 'All' && item.subject !== subject) return false;
      if (!q) return true;
      return (
        item.question.toLowerCase().includes(q) ||
        item.topic.toLowerCase().includes(q) ||
        (item.title ?? '').toLowerCase().includes(q)
      );
    });
  }, [questions, subject, query]);

  return (
    <div className="w-72 flex-none border-r bg-background flex flex-col h-full">
      <div className="p-3 border-b space-y-2">
        <p className="text-sm font-semibold">Question bank</p>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search questions…"
            className="pl-8 h-8 text-sm"
          />
        </div>
        <div className="flex flex-wrap gap-1">
          {subjects.map((s) => (
            <button
              key={s}
              onClick={() => setSubject(s)}
              className={cn(
                'px-2 py-0.5 rounded-full text-[11px] font-medium border transition-colors',
                subject === s ? 'bg-primary text-primary-foreground border-primary' : 'bg-card hover:bg-muted border-border text-muted-foreground',
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {loading && <p className="text-xs text-muted-foreground p-2">Loading…</p>}
        {!loading && filtered.length === 0 && <p className="text-xs text-muted-foreground p-2">No questions match.</p>}
        {filtered.map((q) => (
          <div
            key={q.id}
            draggable
            onDragStart={(e) => onDragStartQuestion(q, e)}
            className="rounded-md border bg-card p-2 cursor-grab active:cursor-grabbing hover:border-primary/50 transition-colors"
            title="Drag onto the canvas"
          >
            <div className="flex items-center gap-1 mb-1">
              <Badge variant="outline" className="text-[10px] px-1 py-0">{q.subject}</Badge>
              <Badge variant="secondary" className="text-[10px] px-1 py-0">★{q.difficulty}</Badge>
            </div>
            <p className="text-xs font-medium line-clamp-2">{q.title || q.question}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
