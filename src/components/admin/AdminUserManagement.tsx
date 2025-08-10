import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Search, Plus, Minus, User, CreditCard } from 'lucide-react';

interface UserWithCredits {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  credits: number;
}

export const AdminUserManagement = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserWithCredits | null>(null);
  const [creditAmount, setCreditAmount] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<'add' | 'remove'>('add');

  const { data: users, isLoading, refetch, error } = useQuery({
    queryKey: ['admin-users', searchTerm],
    queryFn: async () => {
      console.log('Fetching users for admin dashboard...');
      
      // Double-check admin status with enhanced security function
      const { data: isAdminVerified, error: adminVerifyError } = await supabase.rpc('verify_admin_access_with_logging');
      
      if (adminVerifyError || !isAdminVerified) {
        console.error('Admin verification failed:', adminVerifyError);
        throw new Error('Unauthorized: Admin access verification failed');
      }
      
      let query = supabase
        .from('profiles')
        .select(`
          id,
          email,
          full_name,
          created_at
        `)
        .order('created_at', { ascending: false });

      if (searchTerm) {
        query = query.or(`email.ilike.%${searchTerm}%,full_name.ilike.%${searchTerm}%`);
      }

      const { data: profilesData, error: profilesError } = await query;
      
      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        throw profilesError;
      }

      console.log('Profiles data retrieved by admin');

      // Get credits for all users separately
      const { data: creditsData, error: creditsError } = await supabase
        .from('credits_balance')
        .select('user_id, credits');

      if (creditsError) {
        console.error('Error fetching credits:', creditsError);
        // Don't throw error for credits, just log it
      }

      console.log('Credits data retrieved by admin');

      // Map profiles with their credits
      const usersWithCredits = profilesData?.map(user => {
        const userCredits = creditsData?.find(c => c.user_id === user.id);
        return {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          created_at: user.created_at,
          credits: userCredits?.credits || 0
        };
      }) || [];

      console.log(`Admin accessed ${usersWithCredits.length} user records`);
      return usersWithCredits as UserWithCredits[];
    },
    refetchInterval: 30000,
  });

  // Add error logging
  if (error) {
    console.error('User management query error:', error);
  }

  const handleCreditAction = async () => {
    if (!selectedUser || !creditAmount) return;

    const amount = parseInt(creditAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid credit amount');
      return;
    }

    try {
      console.log('Attempting credit action:', { userId: selectedUser.id, action: actionType, amount, email: selectedUser.email });
      
      const { data, error } = await supabase.functions.invoke('admin-credit-management', {
        body: {
          userId: selectedUser.id,
          action: actionType,
          amount,
          targetUserEmail: selectedUser.email,
        }
      });

      console.log('Credit action response:', { data, error });

      if (error) {
        console.error('Credit action error:', error);
        throw error;
      }

      toast.success(
        `Successfully ${actionType === 'add' ? 'added' : 'removed'} ${amount} credits ${
          actionType === 'add' ? 'to' : 'from'
        } ${selectedUser.email}`
      );

      setIsDialogOpen(false);
      setSelectedUser(null);
      setCreditAmount('');
      refetch();
    } catch (error) {
      console.error('Error managing credits:', error);
      toast.error(`Failed to update credits: ${error.message || 'Please try again.'}`);
    }
  };

  const openCreditDialog = (user: UserWithCredits, action: 'add' | 'remove') => {
    setSelectedUser(user);
    setActionType(action);
    setIsDialogOpen(true);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          <CardDescription>Loading users...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            User Management
          </CardTitle>
          <CardDescription>
            Search for users and manage their credit balances
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search by email or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Credits</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users?.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="font-medium">
                        {user.full_name || 'No name set'}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {user.email}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                        {user.credits}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(user.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openCreditDialog(user, 'add')}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openCreditDialog(user, 'remove')}
                          disabled={user.credits === 0}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {users?.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No users found matching your search criteria.
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'add' ? 'Add' : 'Remove'} Credits
            </DialogTitle>
            <DialogDescription>
              {actionType === 'add' ? 'Add credits to' : 'Remove credits from'} {selectedUser?.email}
              <br />
              Current balance: {selectedUser?.credits} credits
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="credit-amount">
                Number of credits to {actionType}
              </Label>
              <Input
                id="credit-amount"
                type="number"
                min="1"
                value={creditAmount}
                onChange={(e) => setCreditAmount(e.target.value)}
                placeholder="Enter credit amount"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreditAction}>
              {actionType === 'add' ? 'Add' : 'Remove'} Credits
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};