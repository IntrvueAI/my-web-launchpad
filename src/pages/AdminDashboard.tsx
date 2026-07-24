import React, { useState } from 'react';
import { useAdminStatus } from '@/hooks/useAdminStatus';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Temporary passcode fallback so an admin isn't locked out if their email isn't allow-listed.
// NOTE: this lives in the client bundle, so it is NOT strong security — the email allowlist
// (admin_users table) is the real gate. Override via VITE_ADMIN_PASSCODE. Change/remove before scale.
const ADMIN_PASSCODE = (import.meta.env.VITE_ADMIN_PASSCODE as string) || 'intrvue-admin-2026';
import { AdminOverview } from '@/components/admin/AdminOverview';
import { AdminUserManagement } from '@/components/admin/AdminUserManagement';
import { AdminInterviews } from '@/components/admin/AdminInterviews';
import { AdminUserFeedback } from '@/components/admin/AdminUserFeedback';
import { AdminSystemHealth } from '@/components/admin/AdminSystemHealth';
import { AdminAuditLog } from '@/components/admin/AdminAuditLog';
import { AdminQuestions } from '@/components/admin/AdminQuestions';
import { AdminDailyQuestions } from '@/components/admin/AdminDailyQuestions';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { Shield, LogOut, ExternalLink } from 'lucide-react';

export default function AdminDashboard() {
  const { isAdmin, isLoading, error } = useAdminStatus();
  const { user, signOut, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem('admin_unlocked') === '1');
  const [passcode, setPasscode] = useState('');
  const [passError, setPassError] = useState(false);

  const handleSignOut = async () => {
    sessionStorage.removeItem('admin_unlocked');
    setUnlocked(false);
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

  const tryUnlock = () => {
    if (passcode.trim() === ADMIN_PASSCODE) {
      sessionStorage.setItem('admin_unlocked', '1');
      setUnlocked(true);
    } else {
      setPassError(true);
    }
  };

  // Add error logging
  if (error) {
    console.error('Admin status check error:', error);
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin && !unlocked) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Admin access</CardTitle>
            <CardDescription>
              Your account isn't allow-listed. Enter the admin passcode to continue.
            </CardDescription>
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
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground">Manage users, credits, and system health</p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            {user && <span className="text-sm text-muted-foreground hidden sm:inline">{user.email}</span>}
            <Button variant="outline" size="sm" className="gap-2" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" /> Sign out
            </Button>
          </div>
        </div>

        {/* TEMP: design-reference page previews — remove once they're finalised or scrapped. */}
        <div className="flex flex-wrap items-center gap-2 mb-6 rounded-lg border border-dashed p-3">
          <span className="text-xs font-medium text-muted-foreground mr-1">Design previews (draft, not live):</span>
          <Button variant="secondary" size="sm" className="gap-2" asChild>
            <Link to="/admin/about-preview" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3.5 w-3.5" /> About us
            </Link>
          </Button>
          <Button variant="secondary" size="sm" className="gap-2" asChild>
            <Link to="/admin/faq-preview" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3.5 w-3.5" /> FAQ
            </Link>
          </Button>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 md:grid-cols-8">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="questions">Questions</TabsTrigger>
            <TabsTrigger value="daily">Daily Q</TabsTrigger>
            <TabsTrigger value="interviews">Interviews</TabsTrigger>
            <TabsTrigger value="feedback">Feedback</TabsTrigger>
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