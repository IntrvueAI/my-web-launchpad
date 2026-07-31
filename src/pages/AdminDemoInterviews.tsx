import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAdminStatus } from '@/hooks/useAdminStatus';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { INTERVIEW_TYPES, InterviewType } from '@/config/interviewTypes';
import { InterviewPlatformV2 } from '@/components/InterviewPlatformV2';
import { ArrowLeft } from 'lucide-react';

/**
 * Admin-only launcher for interview types not shown in the normal picker (getAllInterviewTypes
 * filters out anything with adminOnly: true) — currently just 11-plus-v2, but built to hold future
 * in-progress/experimental interview variants without exposing them to real users. Not linked
 * anywhere public — reached via /admin/demo-interviews.
 */
const DEMO_TYPES: InterviewType[] = Object.values(INTERVIEW_TYPES).filter((iv) => iv.adminOnly);

export default function AdminDemoInterviews() {
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
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 pt-6">
          <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => setActive(null)}>
            <ArrowLeft className="h-3.5 w-3.5" /> Back to demo interviews
          </Button>
        </div>
        <InterviewPlatformV2 selectedInterviewType={active} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Demo interviews</h1>
            <p className="text-sm text-muted-foreground">In-progress interview variants, not shown to real users yet.</p>
          </div>
          <Link to="/admin" className="text-sm text-primary underline">← Back to admin</Link>
        </div>

        {DEMO_TYPES.length === 0 ? (
          <Card className="p-6 text-center text-muted-foreground">Nothing marked adminOnly right now.</Card>
        ) : (
          <div className="grid gap-4">
            {DEMO_TYPES.map((iv) => (
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
        )}
      </div>
    </div>
  );
}
