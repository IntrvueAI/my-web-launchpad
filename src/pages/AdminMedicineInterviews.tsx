import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAdminStatus } from '@/hooks/useAdminStatus';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { INTERVIEW_TYPES, InterviewType } from '@/config/interviewTypes';
import { InterviewPlatform } from '@/components/InterviewPlatform';
import { InterviewPlatformV2 } from '@/components/InterviewPlatformV2';
import { TavusInterviewPlatform } from '@/components/TavusInterviewPlatform';
import { ArrowLeft, Stethoscope, ListChecks, MessageCircleQuestion, KeyRound } from 'lucide-react';

/**
 * Reached either by a real admin, or by anyone with a normal (non-admin) signed-in account who
 * enters TESTER_PASSCODE — a separate, narrower passcode from the real admin one (VITE_ADMIN_PASSCODE),
 * so it can be shared with an invited tester (e.g. "give a friend a link to try Medicine") without
 * handing out real admin access. Deliberately NOT strong security (client-bundle constant, like the
 * admin passcode) — fine for "one invited friend tries a beta feature", not a real access boundary.
 * Rotate/remove VITE_MED_TESTER_PASSCODE to revoke.
 */
const TESTER_PASSCODE = (import.meta.env.VITE_MED_TESTER_PASSCODE as string) || 'try-the-med-interview';

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
  const { user, loading: authLoading, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [active, setActive] = useState<InterviewType | null>(null);
  const [testerUnlocked, setTesterUnlocked] = useState(() => sessionStorage.getItem('med_tester_unlocked') === '1');
  const [passcode, setPasscode] = useState('');
  const [passError, setPassError] = useState(false);

  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // Need a real (any) account first — credits/interview_sessions all key off a real user id.
  // Signing up takes 30 seconds and doesn't require anything beyond an email + password.
  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4 text-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Sign in first</CardTitle>
            <CardDescription>You need any account (no admin access required) before you can try this — it takes 30 seconds to sign up.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full" onClick={() => navigate('/auth')}>Go to sign in / sign up</Button>
            <Button variant="outline" className="w-full" onClick={() => signInWithGoogle()}>Sign in with Google</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const tryUnlock = () => {
    if (passcode.trim() === TESTER_PASSCODE) {
      sessionStorage.setItem('med_tester_unlocked', '1');
      setTesterUnlocked(true);
    } else {
      setPassError(true);
    }
  };

  if (!isAdmin && !testerUnlocked) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4 text-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-2">
              <KeyRound className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Invited testers only</CardTitle>
            <CardDescription>Enter the passcode you were given to try the Medicine interview.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              type="password"
              value={passcode}
              autoFocus
              placeholder="Passcode"
              onChange={(e) => { setPasscode(e.target.value); setPassError(false); }}
              onKeyDown={(e) => e.key === 'Enter' && tryUnlock()}
            />
            {passError && <p className="text-sm text-destructive">Incorrect passcode.</p>}
            <Button className="w-full" onClick={tryUnlock}>Unlock</Button>
          </CardContent>
        </Card>
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
