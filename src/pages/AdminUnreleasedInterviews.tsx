import { Link } from 'react-router-dom';
import { useAdminStatus } from '@/hooks/useAdminStatus';
import { Card } from '@/components/ui/card';
import { INTERVIEW_TYPES } from '@/config/interviewTypes';
import { AdminInterviewLauncher } from '@/components/admin/AdminInterviewLauncher';
import { Stethoscope, ExternalLink } from 'lucide-react';

/**
 * Every interview type marked `adminOnly: true` lands here, one place to find/try/retire anything
 * not on the real public picker (in-progress variants, A/B experiments, retired versions like the
 * old 'demo' type). Admin-only, not linked anywhere public. Replaces the old /admin/demo-interviews
 * (same idea, generalized name + fixed the provider-routing bug it had — see AdminInterviewLauncher).
 *
 * medicine-mmi is deliberately excluded from the generic list below: it has its own richer page
 * (tester-passcode gate for non-admin guest testing, station-type breakdown) — linked out instead.
 */
export default function AdminUnreleasedInterviews() {
  const { isAdmin, isLoading } = useAdminStatus();

  const types = Object.values(INTERVIEW_TYPES).filter((iv) => iv.adminOnly && iv.id !== 'medicine-mmi');

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

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Unreleased interviews</h1>
            <p className="text-sm text-muted-foreground">Every interview type not on the public picker — in-progress, experimental, or retired.</p>
          </div>
          <Link to="/admin" className="text-sm text-primary underline whitespace-nowrap">← Back to admin</Link>
        </div>

        <Link to="/admin/medicine-interviews" className="block mb-4">
          <Card className="p-4 flex items-center justify-between gap-4 hover:border-primary/40 transition-colors">
            <div className="flex items-center gap-3">
              <Stethoscope className="h-5 w-5 text-primary" />
              <div>
                <div className="text-sm font-semibold">Medicine MMI Interview</div>
                <p className="text-xs text-muted-foreground">Has its own page — tester-passcode guest access, station breakdown.</p>
              </div>
            </div>
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
          </Card>
        </Link>

        <AdminInterviewLauncher
          types={types}
          emptyMessage="Nothing else marked adminOnly right now."
          backLabel="Back to unreleased interviews"
        />
      </div>
    </div>
  );
}
