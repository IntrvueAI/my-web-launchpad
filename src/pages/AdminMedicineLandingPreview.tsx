import { Link } from 'react-router-dom';
import { useAdminStatus } from '@/hooks/useAdminStatus';
import { MedicineLandingCoralPreview } from '@/components/marketing/MedicineLandingCoralPreview';

/**
 * Admin-only, no-toggle view of the coral Medicine landing design — the same component the public
 * /medicine page now offers via its "View coral design" switch (src/pages/Medicine.tsx). Kept
 * around as a direct link for reviewing this one design without the toggle button.
 */
export default function AdminMedicineLandingPreview() {
  const { isAdmin, isLoading } = useAdminStatus();

  if (isLoading) return <div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  if (!isAdmin) return <div className="min-h-screen bg-background flex items-center justify-center px-4 text-center"><p className="text-muted-foreground">Admin access required.</p></div>;

  return (
    <div>
      <div style={{ background: '#1C2029', color: '#fff' }} className="text-sm px-4 py-2 flex items-center justify-between gap-3 flex-wrap sticky top-0 z-[70]">
        <span>Preview only — old white/coral palette, not the live public page.</span>
        <Link to="/admin/medicine-portal" className="underline whitespace-nowrap">← Back to Medicine Portal</Link>
      </div>
      <MedicineLandingCoralPreview />
    </div>
  );
}
