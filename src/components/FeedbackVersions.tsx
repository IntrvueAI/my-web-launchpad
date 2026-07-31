import { useState } from 'react';
import { InterviewFeedback } from './InterviewFeedback';
import { InterviewFeedbackV2 } from './InterviewFeedbackV2';
import { Button } from '@/components/ui/button';
import { ArrowLeftRight } from 'lucide-react';
import { useAdminStatus } from '@/hooks/useAdminStatus';

/**
 * Shows interview feedback in the V2 layout by default for everyone. The original layout
 * (InterviewFeedback) is kept reachable, but only admins get the toggle to switch back and
 * compare — regular users just see V2, full stop, no A/B toggle in their way.
 * Props are passed straight through to whichever version is showing.
 */
export function FeedbackVersions(props: any) {
  const { isAdmin } = useAdminStatus();
  const [v2, setV2] = useState(true);
  return (
    <div className="space-y-6">
      {v2 ? <InterviewFeedbackV2 {...props} /> : <InterviewFeedback {...props} />}
      {isAdmin && (
        <div className="flex flex-col items-center gap-1.5 pt-2">
          <Button variant="outline" onClick={() => setV2((x) => !x)} className="gap-2 rounded-full">
            <ArrowLeftRight className="w-4 h-4" />
            {v2 ? 'Admin: view original feedback format' : 'Admin: back to V2'}
          </Button>
          <span className="text-xs text-muted-foreground">
            Admin-only — regular users always see V2.
          </span>
        </div>
      )}
    </div>
  );
}
