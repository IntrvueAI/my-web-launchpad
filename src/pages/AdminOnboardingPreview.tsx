import { Link } from 'react-router-dom';
import { useAdminStatus } from '@/hooks/useAdminStatus';
import { OnboardingFlowPreview } from '@/components/admin/OnboardingFlowPreview';

/**
 * TEMP preview route for the redesigned signup onboarding flow (name → schools → experience level →
 * study intensity → generated mini plan), built with the site's existing Bright Deck tokens and
 * framer-motion for the step transitions. Not wired to real signup yet — nothing here writes to
 * `profiles`. Once reviewed, promote OnboardingFlowPreview into the real post-signup flow (it's meant
 * to replace the free-text PostSignupForm.tsx dialog) and delete this file + its route in App.tsx.
 */
export default function AdminOnboardingPreview() {
  const { isAdmin, isLoading } = useAdminStatus();

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
    <div>
      <div className="fixed top-3 left-3 z-[60]">
        <Link
          to="/admin"
          className="text-xs font-medium text-muted-foreground hover:text-foreground bg-card/90 backdrop-blur-sm border border-border rounded-full px-3 py-1.5 shadow-sm transition-colors"
        >
          ← Back to admin
        </Link>
      </div>
      <OnboardingFlowPreview />
    </div>
  );
}
