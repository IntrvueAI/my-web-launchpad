import React from 'react';
import { useAdminStatus } from '@/hooks/useAdminStatus';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { AdminOverview } from '@/components/admin/AdminOverview';
import { AdminUserManagement } from '@/components/admin/AdminUserManagement';
import { AdminInterviews } from '@/components/admin/AdminInterviews';
import { AdminSystemHealth } from '@/components/admin/AdminSystemHealth';
import { AdminAuditLog } from '@/components/admin/AdminAuditLog';
import { AdminQuestions } from '@/components/admin/AdminQuestions';
import { AdminDailyQuestions } from '@/components/admin/AdminDailyQuestions';
import { AdminWaitlist } from '@/components/admin/AdminWaitlist';
import { ProviderCreditAlert } from '@/components/admin/ProviderCreditAlert';
import { AdminHub, useAdminPlatform } from '@/components/admin/AdminHub';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { Shield, LogOut, ArrowLeft } from 'lucide-react';

export default function AdminDashboard() {
  const { isAdmin, isLoading, error, refetch } = useAdminStatus();
  const { user, signOut, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [platform, setPlatform] = useAdminPlatform();
  const [tab, setTab] = React.useState('overview');
  // The old dashboard Feedback tab moved to /admin/feedback.
  React.useEffect(() => {
    if (new URLSearchParams(window.location.search).get('tab') === 'feedback') navigate('/admin/feedback', { replace: true });
  }, [navigate]);
  const { toast } = useToast();

  const handleSignOut = async () => {
    sessionStorage.removeItem('admin_unlocked');
    await signOut();
    navigate('/auth'); // land on the full sign-in page so it's obvious you're signed out
  };

  const handleGoogle = async () => {
    const { error } = await signInWithGoogle();
    if (error) {
      toast({
        title: 'Google sign-in unavailable',
        description: `${error.message || error}. Use the main sign-in page instead.`,
        variant: 'destructive',
      });
      navigate('/auth');
    }
    // On success the browser redirects to Google, so nothing else to do here.
  };

  // Add error logging
  if (error) {
    console.error('Admin status check error:', error);
  }

  if (user && isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Admin access</CardTitle>
            <CardDescription>
              {error ? 'Administrator access could not be checked. Please retry.' : 'Sign in with an authorised administrator account to continue.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {user && <Button variant="outline" className="w-full" onClick={() => refetch()}>Check access again</Button>}

            <div className="pt-3 mt-1 border-t space-y-2 text-center">
              <p className="text-xs text-muted-foreground">
                {user ? `Signed in as ${user.email}` : 'Not signed in'} — switch to your admin account:
              </p>
              <Button variant="outline" className="w-full gap-2" onClick={handleGoogle}>
                Sign in with Google
              </Button>
              <Button variant="ghost" size="sm" className="w-full" onClick={() => navigate('/auth')}>
                Go to sign-in page
              </Button>
              {user && (
                <Button variant="ghost" size="sm" className="w-full gap-2" onClick={handleSignOut}>
                  <LogOut className="h-4 w-4" /> Sign out
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center p-1.5">
            <img src="/lovable-uploads/icon-mark.png" alt="intrvue.ai" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground">Medicine and 11+ tools, users, credits and system health</p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            {user && <span className="text-sm text-muted-foreground hidden sm:inline">{user.email}</span>}
            <Button variant="outline" size="sm" className="gap-2" onClick={() => navigate('/')}>
              <ArrowLeft className="h-4 w-4" /> Back to app
            </Button>
            <Button variant="outline" size="sm" className="gap-2" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" /> Sign out
            </Button>
          </div>
        </div>

        <AdminHub platform={platform} onPlatform={setPlatform} onOpenTab={(tab) => { setTab(tab); document.getElementById('admin-tabs')?.scrollIntoView({ behavior: 'smooth' }); }} />

        <ProviderCreditAlert />
        <Tabs id="admin-tabs" value={tab} onValueChange={setTab} className="scroll-mt-4 space-y-6">
          <TabsList className="grid w-full grid-cols-3 md:grid-cols-9">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="questions">Questions</TabsTrigger>
            <TabsTrigger value="daily">Daily Q</TabsTrigger>
            <TabsTrigger value="interviews">Interviews</TabsTrigger>
            {/* Feedback lives on one dedicated page; this keeps its familiar place in the tab bar. */}
            <Link to="/admin/feedback" className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium text-muted-foreground transition-all hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Feedback</Link>
            <TabsTrigger value="waitlist">Waitlist</TabsTrigger>
            <TabsTrigger value="system">System</TabsTrigger>
            <TabsTrigger value="audit">Audit Log</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <AdminOverview />
          </TabsContent>

          <TabsContent value="users">
            <AdminUserManagement />
          </TabsContent>

          <TabsContent value="questions">
            <AdminQuestions />
          </TabsContent>

          <TabsContent value="daily">
            <AdminDailyQuestions />
          </TabsContent>

          <TabsContent value="interviews">
            <AdminInterviews />
          </TabsContent>

          <TabsContent value="waitlist">
            <AdminWaitlist />
          </TabsContent>

          <TabsContent value="system">
            <AdminSystemHealth />
          </TabsContent>

          <TabsContent value="audit">
            <AdminAuditLog />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
