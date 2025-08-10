import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, MessageSquare, CreditCard, DollarSign, TrendingUp } from 'lucide-react';

export const AdminOverview = () => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-overview-stats'],
    queryFn: async () => {
      // Get total users
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Get total feedback sessions
      const { count: totalFeedback } = await supabase
        .from('feedback')
        .select('*', { count: 'exact', head: true });

      // Get total credits distributed
      const { data: creditsData } = await supabase
        .from('credits_balance')
        .select('credits');
      
      const totalCredits = creditsData?.reduce((sum, item) => sum + item.credits, 0) || 0;

      // Get total revenue
      const { data: ordersData } = await supabase
        .from('orders')
        .select('amount, status')
        .in('status', ['paid', 'completed']);

      const totalRevenue = ordersData?.reduce((sum, order) => sum + order.amount, 0) || 0;

      // Get recent activity (last 7 days)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      
      const { count: recentFeedback } = await supabase
        .from('feedback')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', sevenDaysAgo);

      const { count: recentUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', sevenDaysAgo);

      return {
        totalUsers: totalUsers || 0,
        totalFeedback: totalFeedback || 0,
        totalCredits,
        totalRevenue: totalRevenue / 100, // Convert from cents to dollars
        recentFeedback: recentFeedback || 0,
        recentUsers: recentUsers || 0,
      };
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="space-y-0 pb-2">
              <div className="h-4 bg-muted animate-pulse rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted animate-pulse rounded mb-2" />
              <div className="h-3 bg-muted animate-pulse rounded w-3/4" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Users',
      value: stats?.totalUsers || 0,
      description: `+${stats?.recentUsers || 0} this week`,
      icon: Users,
      trend: 'up'
    },
    {
      title: 'Interview Sessions',
      value: stats?.totalFeedback || 0,
      description: `+${stats?.recentFeedback || 0} this week`,
      icon: MessageSquare,
      trend: 'up'
    },
    {
      title: 'Total Credits',
      value: stats?.totalCredits || 0,
      description: 'Credits in circulation',
      icon: CreditCard,
      trend: 'neutral'
    },
    {
      title: 'Revenue',
      value: `$${stats?.totalRevenue?.toFixed(2) || '0.00'}`,
      description: 'Total revenue generated',
      icon: DollarSign,
      trend: 'up'
    },
    {
      title: 'Avg Credits/User',
      value: stats?.totalUsers ? (stats.totalCredits / stats.totalUsers).toFixed(1) : '0.0',
      description: 'Average credits per user',
      icon: TrendingUp,
      trend: 'neutral'
    },
    {
      title: 'Weekly Activity',
      value: `${((stats?.recentFeedback || 0) / (stats?.recentUsers || 1)).toFixed(1)}`,
      description: 'Sessions per new user',
      icon: TrendingUp,
      trend: 'neutral'
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2">System Overview</h2>
        <p className="text-muted-foreground">
          Real-time statistics and key performance indicators
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};