import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Trash2, Key, User, Mail, School, Calendar, X } from 'lucide-react';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface UserProfile {
  id: string;
  full_name: string | null;
  email: string;
  schools: string[] | null;
  interview_date: string | null;
}

export const UserSettings = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    schools: [''] as string[],
    interviewDate: undefined as Date | undefined
  });

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (error) throw error;
      
      setProfile(data);
      setFormData({
        fullName: data.full_name || '',
        email: data.email || user.email || '',
        schools: data.schools || [''],
        interviewDate: data.interview_date ? new Date(data.interview_date) : undefined
      });
    } catch (error: any) {
      toast({
        title: "Error loading profile",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;

    setUpdating(true);
    try {
      // Update profile in database
      const filteredSchools = formData.schools.filter(school => school.trim() !== '');
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: formData.fullName,
          email: formData.email,
          schools: filteredSchools.length > 0 ? filteredSchools : null,
          interview_date: formData.interviewDate ? formData.interviewDate.toISOString().split('T')[0] : null,
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      // Update auth metadata name if changed so greetings reflect correctly
      if (formData.fullName !== profile.full_name) {
        const { error: metaError } = await supabase.auth.updateUser({
          data: { full_name: formData.fullName }
        });
        if (metaError) throw metaError;
      }

      // Update email in auth if it changed
      if (formData.email !== user.email) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: formData.email
        });

        if (emailError) throw emailError;
        
        toast({
          title: "Profile updated",
          description: "Your profile has been updated. Please check your email to confirm the new email address.",
        });
      } else {
        toast({
          title: "Profile updated",
          description: "Your profile has been updated successfully.",
        });
      }

      await loadProfile();
    } catch (error: any) {
      toast({
        title: "Error updating profile",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleResetPassword = async () => {
    if (!user) return;

    setResettingPassword(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email!, {
        redirectTo: `${window.location.origin}/auth`
      });

      if (error) throw error;

      toast({
        title: "Password reset email sent",
        description: "Please check your email for password reset instructions.",
      });
    } catch (error: any) {
      toast({
        title: "Error sending reset email",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setResettingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;

    setDeleting(true);
    try {
      // Delete the user account - this will cascade to profiles table
      const { error } = await (supabase as any).rpc('delete_user');
      
      if (error) {
        // Fallback: try direct auth deletion (this requires admin privileges)
        const { error: authError } = await supabase.auth.admin.deleteUser(user.id);
        if (authError) throw authError;
      }

      toast({
        title: "Account deleted",
        description: "Your account has been permanently deleted.",
      });

      await signOut();
    } catch (error: any) {
      toast({
        title: "Error deleting account",
        description: "Unable to delete account. Please contact support.",
        variant: "destructive"
      });
    } finally {
      setDeleting(false);
    }
  };

  const addSchoolField = () => {
    setFormData(prev => ({
      ...prev,
      schools: [...prev.schools, '']
    }));
  };

  const removeSchoolField = (index: number) => {
    setFormData(prev => ({
      ...prev,
      schools: prev.schools.filter((_, i) => i !== index)
    }));
  };

  const updateSchool = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      schools: prev.schools.map((school, i) => i === index ? value : school)
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account settings and preferences.
        </p>
      </div>

      <div className="grid gap-6">
        {/* Profile Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile Information
            </CardTitle>
            <CardDescription>
              Update your personal information and email address.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  value={formData.fullName}
                  onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                  placeholder="Enter your full name"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Enter your email address"
                />
              </div>

              <Button type="submit" disabled={updating}>
                {updating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update Profile'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Interview Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <School className="h-5 w-5" />
              Interview Information
            </CardTitle>
            <CardDescription>
              Manage your school applications and interview dates.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="schools">Schools you're applying to</Label>
              <div className="space-y-2 mt-2">
                {formData.schools.map((school, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={school}
                      onChange={(e) => updateSchool(index, e.target.value)}
                      placeholder="Enter school name"
                    />
                    {formData.schools.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => removeSchoolField(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={addSchoolField}
                  className="w-full"
                >
                  Add another school
                </Button>
              </div>
            </div>

            <div>
              <Label>First Interview Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal mt-2",
                      !formData.interviewDate && "text-muted-foreground"
                    )}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {formData.interviewDate ? format(formData.interviewDate, "PPP") : "Select interview date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={formData.interviewDate}
                    onSelect={(date) => setFormData(prev => ({ ...prev, interviewDate: date }))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Security
            </CardTitle>
            <CardDescription>
              Manage your password and account security.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label>Password</Label>
                <p className="text-sm text-muted-foreground mb-2">
                  Reset your password by sending a reset link to your email.
                </p>
                <Button 
                  variant="outline" 
                  onClick={handleResetPassword}
                  disabled={resettingPassword}
                >
                  {resettingPassword ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-4 w-4" />
                      Send Password Reset Email
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Danger Zone
            </CardTitle>
            <CardDescription>
              Permanently delete your account and all associated data.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={deleting}>
                  {deleting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Account
                    </>
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete your
                    account and remove all your data from our servers, including:
                    <br />
                    <br />
                    • Your profile information
                    <br />
                    • All interview feedback and history
                    <br />
                    • Any saved preferences
                    <br />
                    <br />
                    You will need to create a new account to use the service again.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteAccount}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete Account
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};