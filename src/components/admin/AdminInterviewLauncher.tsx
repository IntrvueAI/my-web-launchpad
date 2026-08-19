import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { InterviewType } from '@/config/interviewTypes';
import { InterviewPlatform } from '@/components/InterviewPlatform';
import { InterviewPlatformV2 } from '@/components/InterviewPlatformV2';
import { TavusInterviewPlatform } from '@/components/TavusInterviewPlatform';
import { ArrowLeft } from 'lucide-react';

/**
 * Provider-aware launch, shared by every admin interview-launcher page — mirrors the routing switch
 * in pages/Index.tsx so admin previews behave identically to the real app. Previously duplicated
 * (and buggy) in two places: AdminDemoInterviews.tsx hardcoded InterviewPlatformV2 for everything
 * regardless of `provider`, which would have launched a 'tavus' or default-provider adminOnly type
 * on the wrong platform component. AdminMedicineInterviews.tsx had the correct routing; this is
 * that logic, extracted once.
 */
export function pickPlatform(iv: InterviewType) {
  if (iv.provider === 'tavus') return TavusInterviewPlatform;
  if (iv.provider === 'anam-deepgram') return InterviewPlatformV2;
  return InterviewPlatform;
}

interface AdminInterviewLauncherProps {
  types: InterviewType[];
  emptyMessage?: string;
  backLabel?: string;
}

/** Card grid + provider-aware launch/back flow for a list of interview types, reused by every
 *  admin "try this interview type" page. */
export function AdminInterviewLauncher({ types, emptyMessage = 'Nothing to show right now.', backLabel = 'Back' }: AdminInterviewLauncherProps) {
  const [active, setActive] = useState<InterviewType | null>(null);

  if (active) {
    const Platform = pickPlatform(active);
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 pt-6">
          <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => setActive(null)}>
            <ArrowLeft className="h-3.5 w-3.5" /> {backLabel}
          </Button>
        </div>
        <Platform selectedInterviewType={active} />
      </div>
    );
  }

  if (types.length === 0) {
    return <Card className="p-6 text-center text-muted-foreground">{emptyMessage}</Card>;
  }

  return (
    <div className="grid gap-4">
      {types.map((iv) => (
        <Card key={iv.id} className="p-5 flex items-center justify-between gap-4">
          <div>
            <h2 className="font-semibold">{iv.name}</h2>
            <p className="text-sm text-muted-foreground mt-1">{iv.description}</p>
            <div className="flex gap-1.5 mt-2 flex-wrap">
              {iv.tags.map((t) => (
                <span key={t} className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{t}</span>
              ))}
            </div>
          </div>
          <Button onClick={() => setActive(iv)}>Launch</Button>
        </Card>
      ))}
    </div>
  );
}
