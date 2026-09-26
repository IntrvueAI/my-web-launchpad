import { QuestionOfTheDay } from './QuestionOfTheDay';
import { WarmUp } from './WarmUp';
import { WrongLastTime } from './WrongLastTime';
import { MinigameSection } from '@/components/MinigameSection';
import { Link } from 'react-router-dom';

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

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-4">
          <QuestionOfTheDay name={name} />
          <MinigameSection />
        </div>
        <div className="min-w-0 space-y-4">
          <WarmUp name={name} />
          <WrongLastTime name={name} onViewHistory={onViewHistory} />
          <Link to="/examples" className="block rounded-2xl border bg-card p-5"><h2 className="font-semibold">See how a strong answer works</h2><p className="mt-2 text-sm text-muted-foreground">Try an example, compare your reasoning and have another go.</p><span className="mt-3 block text-sm font-semibold text-primary">Explore worked answers →</span></Link>
        </div>
      </div>

    </div>
  );
}
