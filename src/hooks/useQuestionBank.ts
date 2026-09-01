import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// `questions` isn't in the generated Supabase types yet — same workaround as elsewhere in this
// admin surface (AdminQuestions.tsx, useInterviewFlowsAdmin.ts).
const db = () => (supabase as any).from('questions');

export interface BankQuestionRow {
  id: string;
  subject: string;
  topic: string;
  title: string | null;
  question: string;
  difficulty: number;
  active: boolean;
}

/**
 * The lightweight question-bank listing shared by the flow builder's sidebar and canvas. Both
 * call this with the same query key, so react-query dedupes them into a single network request
 * (and caches it for a minute) instead of the picker, the active-ids check, and the per-node
 * display-data resolution each hitting the `questions` table separately, which is what this
 * replaced — 3 round trips on every editor load down to 1.
 */
export function useQuestionBank() {
  const query = useQuery({
    queryKey: ['question-bank'],
    queryFn: async () => {
      const { data, error } = await db()
        .select('id, subject, topic, title, question, difficulty, active')
        .order('subject')
        .order('topic');
      if (error) throw error;
      return (data ?? []) as BankQuestionRow[];
    },
    staleTime: 60_000, // the bank doesn't change moment-to-moment; avoid refetching on every remount
  });

  const questions = query.data ?? [];
  const activeQuestions = useMemo(() => questions.filter((q) => q.active), [questions]);
  const activeQuestionIds = useMemo(() => new Set(activeQuestions.map((q) => q.id)), [activeQuestions]);
  const questionsById = useMemo(() => new Map(questions.map((q) => [q.id, q])), [questions]);

  return {
    questions,
    activeQuestions,
    activeQuestionIds,
    questionsById,
    loading: query.isLoading,
    error: query.error as Error | null,
  };
}
