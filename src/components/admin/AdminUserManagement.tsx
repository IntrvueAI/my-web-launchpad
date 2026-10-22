import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { invokeEdgeFunction } from '@/lib/invokeEdgeFunction';
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
  medicine_credits: number;
}

export const AdminUserManagement = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserWithCredits | null>(null);
  const [creditAmount, setCreditAmount] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<'add' | 'remove'>('add');
  // 11+ and Medicine (MMI Practice) credits are separate balances.
  const [platform, setPlatform] = useState<'11plus' | 'medicine'>('11plus');
  const [note, setNote] = useState('');

  const { data: users, isLoading, refetch, error } = useQuery({
    queryKey: ['admin-users', searchTerm],
    queryFn: async () => {
      // Use basic admin check instead of enhanced one for now
      const { data: isAdminVerified, error: adminVerifyError } = await supabase.rpc('is_current_user_admin');
      
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

      // Get credits for all users separately
      const { data: creditsData, error: creditsError } = await supabase
        .from('credits_balance')
        .select('user_id, credits');

      if (creditsError) {
        console.error('Error fetching credits:', creditsError);
        // Don't throw error for credits, just log it
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: medicineData, error: medicineError } = await (supabase as any)
        .from('medicine_credit_balances')
        .select('user_id, credits');
      if (medicineError) console.error('Error fetching Medicine credits:', medicineError);

      // Map profiles with their credits
      const usersWithCredits = profilesData?.map(user => {
        const userCredits = creditsData?.find(c => c.user_id === user.id);
        const medicineCredits = (medicineData as { user_id: string; credits: number }[] | null)?.find(c => c.user_id === user.id);
        return {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          created_at: user.created_at,
          credits: userCredits?.credits || 0,
          medicine_credits: medicineCredits?.credits || 0,
        };
      }) || [];

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
      const { data, error } = await invokeEdgeFunction('admin-credit-management', {
        body: {
          userId: selectedUser.id,
          action: actionType,
          amount,
          targetUserEmail: selectedUser.email,
          platform,
          ...(platform === 'medicine' && note.trim() ? { note: note.trim().slice(0, 300) } : {}),
        }
      });

      if (error) {
        console.error('Credit action error:', error);
        throw error;
      }

      toast.success(
        `Successfully ${actionType === 'add' ? 'added' : 'removed'} ${amount} ${platform === 'medicine' ? 'Medicine' : '11+'} credits ${
          actionType === 'add' ? 'to' : 'from'
        } ${selectedUser.email}`
      );

      setIsDialogOpen(false);
      setSelectedUser(null);
      setCreditAmount('');
      setNote('');
      refetch();
    } catch (error) {
      console.error('Error managing credits:', error);
      toast.error(`Failed to update credits: ${error.message || 'Please try again.'}`);
    }
  };

  const openCreditDialog = (user: UserWithCredits, action: 'add' | 'remove') => {
    setSelectedUser(user);
    if (action === 'remove') setPlatform(user.medicine_credits > 0 && user.credits === 0 ? 'medicine' : '11plus');
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
            Search for a user by email or name, then click <span className="font-medium">Add credits</span> to grant them interview credits.
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
                  <TableHead>11+ credits</TableHead>
                  <TableHead>Medicine credits</TableHead>
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
                    <TableCell>{user.medicine_credits}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(user.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => openCreditDialog(user, 'add')}
                          className="gap-1"
                        >
                          <Plus className="h-4 w-4" /> Add credits
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openCreditDialog(user, 'remove')}
                          disabled={user.credits === 0 && user.medicine_credits === 0}
                          className="gap-1"
                        >
                          <Minus className="h-4 w-4" /> Remove
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
              Current balance: {platform === 'medicine' ? `${selectedUser?.medicine_credits} Medicine credits` : `${selectedUser?.credits} 11+ credits`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <fieldset>
              <legend className="text-sm font-medium">Balance</legend>
              <div className="mt-2 flex gap-4 text-sm">
                {([['11plus', '11+ credits'], ['medicine', 'Medicine credits']] as const).map(([id, label]) => (
                  <label key={id} className="flex items-center gap-2">
                    <input type="radio" name="credit-platform" value={id} checked={platform === id} onChange={() => setPlatform(id)} />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>
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
            {platform === 'medicine' && (
              <div>
                <Label htmlFor="credit-note">Reason (optional, kept in the Medicine credit history)</Label>
                <Input id="credit-note" value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Refund: connection dropped in station 3" />
              </div>
            )}
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