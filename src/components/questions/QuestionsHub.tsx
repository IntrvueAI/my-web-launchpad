import { QuestionOfTheDay } from './QuestionOfTheDay';
import { WarmUp } from './WarmUp';
import { WrongLastTime } from './WrongLastTime';
import { MinigameSection } from '@/components/MinigameSection';

/** The "Daily practice" screen (deck Questions): today's question, warm-up, review, quick rounds. */
export function QuestionsHub({ name = 'superstar', onViewHistory }: { name?: string; onViewHistory?: () => void }) {
  return (
    <div data-tour="page-questions" className="mx-auto max-w-[1120px] px-4 sm:px-6 py-6 space-y-6">
      <div>
        <h1 className="font-display text-[28px] font-semibold text-white">Daily practice</h1>
        <p className="mt-1.5 text-sm font-semibold text-muted-foreground">
          Warm up, take on today&rsquo;s question, and sharpen up with quick rounds.
        </p>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[1.3fr_1fr]">
        <QuestionOfTheDay name={name} />
        <div className="space-y-4">
          <WarmUp name={name} />
          <WrongLastTime name={name} onViewHistory={onViewHistory} />
        </div>
      </div>

      <div className="pt-2">
        <h2 className="font-display text-lg font-semibold text-white">Quick practice</h2>
        <p className="text-[13px] font-semibold text-muted-foreground mb-4">Sharpen up with quick 10-question rounds.</p>
        <MinigameSection />
      </div>
    </div>
  );
}
