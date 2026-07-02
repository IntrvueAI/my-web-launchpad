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
import { Shield, AlertTriangle } from 'lucide-react';

export default function AdminDashboard() {
  const { isAdmin, isLoading, error } = useAdminStatus();
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem('admin_unlocked') === '1');
  const [passcode, setPasscode] = useState('');
  const [passError, setPassError] = useState(false);

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
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 md:grid-cols-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
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