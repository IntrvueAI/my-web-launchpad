import { useAdminStatus } from '@/hooks/useAdminStatus';
import { Link } from 'react-router-dom';
import { AboutUsPreview } from '@/components/admin/AboutUsPreview';

/**
 * TEMP preview route for the "About us" page design (design-reference/About Us.dc.html), so it can
 * be reviewed before it's a real public page. Not linked anywhere — reached by URL only. Delete
 * this file + the route in App.tsx once the real About page is built (or this is scrapped).
 */
export default function AdminAboutPreview() {
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

  return <AboutUsPreview />;
}
