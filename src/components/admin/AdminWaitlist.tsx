import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Mail, CreditCard } from 'lucide-react';

interface MarketingWaitlistRow {
  id: string;
  email: string;
  source: string;
  created_at: string;
}

interface PaymentWaitlistRow {
  id: string;
  email: string;
  source: string;
  created_at: string;
}

function WaitlistTable({ rows, emptyLabel }: { rows: { id: string; email: string; source: string; created_at: string }[] | undefined; emptyLabel: string }) {
  if (!rows || rows.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">{emptyLabel}</div>;
  }
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Email</TableHead>
            <TableHead>Source</TableHead>
            <TableHead>Joined</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="font-medium">{row.email}</TableCell>
              <TableCell><Badge variant="secondary">{row.source}</Badge></TableCell>
              <TableCell className="text-muted-foreground">{new Date(row.created_at).toLocaleString()}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export const AdminWaitlist = () => {
  const { data: marketing, isLoading: marketingLoading } = useQuery({
    queryKey: ['admin-marketing-waitlist'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marketing_waitlist')
        .select('id, email, source, created_at')
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return data as MarketingWaitlistRow[];
    },
    refetchInterval: 30000,
  });

  const { data: payment, isLoading: paymentLoading } = useQuery({
    queryKey: ['admin-payment-waitlist'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_waitlist')
        .select('id, email, source, created_at')
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return data as PaymentWaitlistRow[];
    },
    refetchInterval: 30000,
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Marketing waitlist
            {marketing && <Badge variant="outline">{marketing.length}</Badge>}
          </CardTitle>
          <CardDescription>
            Public "Join waitlist" signups from the landing page (visitors who haven't signed up yet).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {marketingLoading ? (
            <div className="space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="h-10 bg-muted animate-pulse rounded" />)}</div>
          ) : (
            <WaitlistTable rows={marketing} emptyLabel="No waitlist signups yet." />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment waitlist
            {payment && <Badge variant="outline">{payment.length}</Badge>}
          </CardTitle>
          <CardDescription>
            Logged-in users who registered interest in buying credits while purchases are paused.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {paymentLoading ? (
            <div className="space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="h-10 bg-muted animate-pulse rounded" />)}</div>
          ) : (
            <WaitlistTable rows={payment} emptyLabel="No payment waitlist entries yet." />
          )}
        </CardContent>
      </Card>
    </div>
  );
};
