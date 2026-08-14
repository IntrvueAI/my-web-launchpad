import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAdminStatus } from '@/hooks/useAdminStatus';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { INTERVIEW_TYPES, InterviewType } from '@/config/interviewTypes';
import { InterviewPlatform } from '@/components/InterviewPlatform';
import { InterviewPlatformV2 } from '@/components/InterviewPlatformV2';
import { TavusInterviewPlatform } from '@/components/TavusInterviewPlatform';
import { ArrowLeft, Stethoscope, ListChecks, MessageCircleQuestion } from 'lucide-react';

/**
 * Admin-only pilot for the Medicine MMI interview line — reached via the Admin dashboard, not
 * linked anywhere public. The interview type itself is `adminOnly: true` (src/config/interviewTypes.ts:
 * 'medicine-mmi'), so it never appears in the normal InterviewSelection picker; this page is the
 * only way to launch it while it's under internal review.
 *
 * Deliberately scoped to three transcript-native MMI station types — ethics scenarios, data
 * interpretation/prioritisation, and motivation & reflection — and deliberately excludes role-play
 * / "breaking bad news" stations, which real MMIs grade on tone and delivery, a signal this
 * text-only engine has no access to. See src/interview/subjects/medicine/pack.ts for the full
 * rationale in the pack's own header comment.
 */
const MEDICINE_TYPE: InterviewType | undefined = INTERVIEW_TYPES['medicine-mmi'];

const STATION_INFO = [
  { icon: Stethoscope, label: 'Ethics scenarios', blurb: 'No right answer — reasoning is scored, not the verdict.' },
  { icon: ListChecks, label: 'Data interpretation & prioritisation', blurb: 'Justify a ranking or a read of a statistic.' },
  { icon: MessageCircleQuestion, label: 'Motivation & reflection', blurb: 'Specific, honest answers beat rehearsed ones.' },
];

export default function AdminMedicineInterviews() {
  const { isAdmin, isLoading } = useAdminStatus();
  const [active, setActive] = useState<InterviewType | null>(null);

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
        <div>
          <p className="text-muted-foreground mb-3">Admin access required.</p>
          <Link to="/admin" className="text-primary underline">Go to /admin</Link>
        </div>
      </div>
    );
  }

  if (active) {
    // Route by provider, same logic as pages/Index.tsx — medicine-mmi has no provider set, so it
    // takes the default (proven) InterviewPlatform, not the Deepgram/V2 experiment.
    const Platform =
      active.provider === 'tavus' ? TavusInterviewPlatform :
      active.provider === 'anam-deepgram' ? InterviewPlatformV2 :
      InterviewPlatform;
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 pt-6">
          <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => setActive(null)}>
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </Button>
        </div>
        <Platform selectedInterviewType={active} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Stethoscope className="h-6 w-6 text-primary" /> Medicine Interviews
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              MMI-style practice for medicine &amp; healthcare admissions — internal pilot, not shown to real users yet.
            </p>
          </div>
          <Link to="/admin" className="text-sm text-primary underline whitespace-nowrap">← Back to admin</Link>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 mb-6">
          {STATION_INFO.map((s) => (
            <Card key={s.label} className="p-4">
              <s.icon className="h-5 w-5 text-primary mb-2" />
              <div className="text-sm font-semibold">{s.label}</div>
              <p className="text-xs text-muted-foreground mt-1">{s.blurb}</p>
            </Card>
          ))}
        </div>

        <Card className="p-4 mb-6 border-dashed">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Scoped to what this engine can actually assess from a transcript: reasoning, judgement and
            reflection in words. It deliberately does <strong>not</strong> include role-play/breaking-bad-news
            stations (graded on tone and delivery in real MMIs) or any face/tone/emotion analysis —
            see the founders&apos; notes for why that's out of scope for now.
          </p>
        </Card>

        {!MEDICINE_TYPE ? (
          <Card className="p-6 text-center text-muted-foreground">
            medicine-mmi is not configured in INTERVIEW_TYPES — check src/config/interviewTypes.ts.
          </Card>
        ) : (
          <Card className="p-5 flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-semibold">{MEDICINE_TYPE.name}</h2>
                <Badge variant="secondary" className="text-[10px]">Beta</Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">{MEDICINE_TYPE.description}</p>
              <div className="flex gap-1.5 mt-2 flex-wrap">
                {MEDICINE_TYPE.tags.map((t) => (
                  <span key={t} className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{t}</span>
                ))}
              </div>
            </div>
            <Button onClick={() => setActive(MEDICINE_TYPE)}>Launch</Button>
          </Card>
        )}
      </div>
    </div>
  );
}
