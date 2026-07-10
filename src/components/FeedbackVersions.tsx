import { useState } from 'react';
import { InterviewFeedback } from './InterviewFeedback';
import { InterviewFeedbackV2 } from './InterviewFeedbackV2';
import { Button } from '@/components/ui/button';
import { ArrowLeftRight } from 'lucide-react';

/**
 * Shows the interview feedback with a toggle at the bottom to flip to a second layout
 * (InterviewFeedbackV2) — an A/B so colleagues can compare the two side by side.
 * Props are passed straight through to whichever version is showing.
 */
export function FeedbackVersions(props: any) {
  const [v2, setV2] = useState(false);
  return (
    <div className="space-y-6">
      {v2 ? <InterviewFeedbackV2 {...props} /> : <InterviewFeedback {...props} />}
      <div className="flex flex-col items-center gap-1.5 pt-2">
        <Button variant="outline" onClick={() => setV2((x) => !x)} className="gap-2 rounded-full">
          <ArrowLeftRight className="w-4 h-4" />
          {v2 ? 'Back to original feedback' : 'Second feedback option'}
        </Button>
        <span className="text-xs text-muted-foreground">
          Showing {v2 ? 'version 2' : 'the original'} — same interview, different layout
        </span>
      </div>
    </div>
  );
}
