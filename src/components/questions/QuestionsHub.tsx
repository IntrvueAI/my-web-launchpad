import { WarmUp } from './WarmUp';
import { QuestionOfTheDay } from './QuestionOfTheDay';
import { WrongLastTime } from './WrongLastTime';
import { MinigameSection } from '@/components/MinigameSection';

/**
 * The student "Questions" page: an optional warm-up up top, the daily question and a personalised
 * "review from last time", then the existing quick-fire practice rounds.
 */
export function QuestionsHub({ onViewHistory }: { onViewHistory?: () => void }) {
  return (
    <div className="space-y-6">
      <WarmUp />
      <div className="grid gap-6 lg:grid-cols-2">
        <QuestionOfTheDay />
        <WrongLastTime onViewHistory={onViewHistory} />
      </div>
      <MinigameSection />
    </div>
  );
}
