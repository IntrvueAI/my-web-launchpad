import { WarmUp } from './WarmUp';
import { QuestionOfTheDay } from './QuestionOfTheDay';
import { WrongLastTime } from './WrongLastTime';
import { MinigameSection } from '@/components/MinigameSection';

/**
 * The student "Questions" page: today's question and an optional warm-up up top, a personalised
 * "review from last time", then the quick-fire practice rounds.
 */
export function QuestionsHub({ onViewHistory }: { onViewHistory?: () => void }) {
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Practice</h1>
        <p className="text-muted-foreground">
          Warm up, take on today&rsquo;s question, and review your last session.
        </p>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <QuestionOfTheDay />
        <WarmUp />
      </div>

      <WrongLastTime onViewHistory={onViewHistory} />

      <div className="border-t border-border/60 pt-6">
        <MinigameSection />
      </div>
    </div>
  );
}
