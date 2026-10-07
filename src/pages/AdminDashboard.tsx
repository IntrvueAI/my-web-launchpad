import React from 'react';
import { useAdminStatus } from '@/hooks/useAdminStatus';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { AdminOverview } from '@/components/admin/AdminOverview';
import { AdminUserManagement } from '@/components/admin/AdminUserManagement';
import { AdminInterviews } from '@/components/admin/AdminInterviews';
import { AdminUserFeedback } from '@/components/admin/AdminUserFeedback';
import { AdminSystemHealth } from '@/components/admin/AdminSystemHealth';
import { AdminAuditLog } from '@/components/admin/AdminAuditLog';
import { AdminQuestions } from '@/components/admin/AdminQuestions';
import { AdminDailyQuestions } from '@/components/admin/AdminDailyQuestions';
import { AdminWaitlist } from '@/components/admin/AdminWaitlist';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { Shield, LogOut, ExternalLink, Stethoscope, ArrowLeft, CheckCircle } from 'lucide-react';

export default function AdminDashboard() {
  const { isAdmin, isLoading, error, refetch } = useAdminStatus();
  const { user, signOut, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
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
            <p className="text-muted-foreground">Manage users, credits, and system health</p>
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

        {/* TEMP: internal testing tools, admin-only, not linked anywhere public. */}
        <div className="flex flex-wrap items-center gap-2 mb-6 rounded-lg border border-dashed p-3">
          <span className="text-xs font-medium text-muted-foreground mr-1">Testing tools:</span>
          <Button variant="secondary" size="sm" className="gap-2" asChild>
            <Link to="/admin/guest-trials"><Stethoscope className="h-3.5 w-3.5" /> Beta testing portal</Link>
          </Button>
          <Button variant="secondary" size="sm" asChild>
            <Link to="/admin/guest-feedback">Interview feedback</Link>
          </Button>
          <Button variant="secondary" size="sm" className="gap-2" asChild>
            <Link to="/admin/stt-bakeoff" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3.5 w-3.5" /> STT bake-off
            </Link>
          </Button>
          <Button variant="secondary" size="sm" className="gap-2" asChild>
            <Link to="/admin/school-finder" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3.5 w-3.5" /> School finder
            </Link>
          </Button>
          <Button variant="secondary" size="sm" className="gap-2" asChild>
            <Link to="/admin/unreleased-interviews" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3.5 w-3.5" /> Unreleased interviews
            </Link>
          </Button>
          <Button variant="secondary" size="sm" className="gap-2" asChild>
            <Link to="/admin/medicine-interviews" target="_blank" rel="noopener noreferrer">
              <Stethoscope className="h-3.5 w-3.5" /> Medicine interviews
            </Link>
          </Button>
          <Button variant="secondary" size="sm" className="gap-2" asChild>
            <Link to="/admin/medicine-portal" target="_blank" rel="noopener noreferrer">
              <Stethoscope className="h-3.5 w-3.5" /> Medicine portal
            </Link>
          </Button>
          <Button variant="secondary" size="sm" className="gap-2" asChild>
            <Link to="/admin/medicine-review"><CheckCircle className="h-3.5 w-3.5" /> Review sourced Medicine questions</Link>
          </Button>
          <Button variant="secondary" size="sm" className="gap-2" asChild>
            <Link to="/admin/medicine-landing-preview" target="_blank" rel="noopener noreferrer">
              <Stethoscope className="h-3.5 w-3.5" /> Medicine landing page
            </Link>
          </Button>
          <Button variant="secondary" size="sm" className="gap-2" asChild>
            <Link to="/?dashboardLayout=sidebar" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3.5 w-3.5" /> Preview Dashboard 2
            </Link>
          </Button>
          <Button variant="secondary" size="sm" className="gap-2" asChild>
            <Link to="/admin/question-review" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3.5 w-3.5" /> Question review (overnight batch)
            </Link>
          </Button>
          <Button variant="secondary" size="sm" className="gap-2" asChild>
            <Link to="/admin/interview-question-review" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3.5 w-3.5" /> Interview question review (thought-provoking batch)
            </Link>
          </Button>
          <Button variant="secondary" size="sm" className="gap-2" asChild>
            <Link to="/admin/interview-flow-builder" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3.5 w-3.5" /> Interview flow builder
            </Link>
          </Button>
          <Button variant="secondary" size="sm" className="gap-2" asChild>
            <Link to="/?replayOnboarding=true" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3.5 w-3.5" /> Replay onboarding flow
            </Link>
          </Button>
          <Button variant="secondary" size="sm" className="gap-2" asChild>
            <Link to="/admin/logs" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3.5 w-3.5" /> Logs
            </Link>
          </Button>
        </div>

        <Tabs defaultValue={new URLSearchParams(window.location.search).get('tab') === 'feedback' ? 'feedback' : 'overview'} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 md:grid-cols-9">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="questions">Questions</TabsTrigger>
            <TabsTrigger value="daily">Daily Q</TabsTrigger>
            <TabsTrigger value="interviews">Interviews</TabsTrigger>
            <TabsTrigger value="feedback">Feedback</TabsTrigger>
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

          <TabsContent value="feedback">
            <AdminUserFeedback />
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
