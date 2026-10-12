import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Activity, Database, Users, AlertCircle, CheckCircle, Clock, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { LiveInterviews } from './LiveInterviews';

const DEFAULT_RANGE_DAYS = 30;
const startOfDay = (d: Date) => { const c = new Date(d); c.setHours(0, 0, 0, 0); return c; };
const endOfDay = (d: Date) => { const c = new Date(d); c.setHours(23, 59, 59, 999); return c; };

export const AdminSystemHealth = () => {
  // Drives every "in range" stat below. null dateFrom = All time. Defaults to the last 30 days.
  const [dateFrom, setDateFrom] = useState<Date | null>(startOfDay(new Date(Date.now() - DEFAULT_RANGE_DAYS * 24 * 60 * 60 * 1000)));
  const [dateTo, setDateTo] = useState<Date>(new Date());
  const isAllTime = dateFrom === null;

  const { data: healthData, isLoading } = useQuery({
    queryKey: ['admin-system-health', dateFrom?.toISOString() ?? 'all', dateTo.toISOString()],
    queryFn: async () => {
      const rangeEnd = endOfDay(dateTo);

      // "Query latency" doubles as the database-health check: if this fails, everything below fails
      // too, and the real error surfaces — no more hardcoded 'Connected'.
      const latencyStart = performance.now();
      let sessionsQuery = supabase.from('interview_sessions').select('*', { count: 'exact', head: true }).lte('started_at', rangeEnd.toISOString());
      if (dateFrom) sessionsQuery = sessionsQuery.gte('started_at', dateFrom.toISOString());
      const { count: recentSessions } = await sessionsQuery;
      const queryLatencyMs = Math.round(performance.now() - latencyStart);

      // Distinct users in range — head:true only returns a row count, so genuine dedup needs the
      // actual user_id values fetched and deduped client-side (the old version of this metric counted
      // rows, not distinct users, and was never even rendered — see git history).
      let userRowsQuery = supabase.from('interview_sessions').select('user_id').lte('started_at', rangeEnd.toISOString());
      if (dateFrom) userRowsQuery = userRowsQuery.gte('started_at', dateFrom.toISOString());
      const { data: recentUserRows } = await userRowsQuery;
      const distinctActiveUsers = new Set((recentUserRows ?? []).map((r: any) => r.user_id)).size;

      // Real error rate, grounded in interview_sessions.status (not the old "feedback.total_score is
      // null" proxy) — session outcomes over the selected range.
      let outcomeQuery = supabase.from('interview_sessions').select('status').lte('started_at', rangeEnd.toISOString());
      if (dateFrom) outcomeQuery = outcomeQuery.gte('started_at', dateFrom.toISOString());
      const { data: outcomeRows } = await outcomeQuery;
      const outcomes = { completed: 0, error: 0, abandoned: 0, active: 0, other: 0 };
      for (const r of (outcomeRows ?? []) as any[]) {
        if (r.status in outcomes) outcomes[r.status as keyof typeof outcomes]++;
        else outcomes.other++;
      }
      const totalOutcomes = Object.values(outcomes).reduce((a, b) => a + b, 0);
      const errorRatePct = totalOutcomes > 0 ? Math.round((outcomes.error / totalOutcomes) * 100) : 0;

      const { data: dbStats } = await supabase
        .from('profiles')
        .select('created_at')
        .order('created_at', { ascending: false })
        .limit(1);
      const lastUserCreated = dbStats?.[0]?.created_at ? new Date(dbStats[0].created_at) : null;

      const systemStatus = errorRatePct >= 30 ? 'error' : errorRatePct >= 10 ? 'warning' : 'healthy';

      return {
        recentSessions: recentSessions || 0,
        distinctActiveUsers,
        outcomes,
        errorRatePct,
        queryLatencyMs,
        lastUserCreated,
        systemStatus,
      };
    },
    refetchInterval: 60000, // LiveInterviews refreshes itself more often
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>System Health</CardTitle>
            <CardDescription>Loading system status...</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-16 bg-muted animate-pulse rounded" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy':
        return <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50"><CheckCircle className="h-3 w-3 mr-1" />Healthy</Badge>;
      case 'warning':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-200 bg-yellow-50"><AlertCircle className="h-3 w-3 mr-1" />Warning</Badge>;
      case 'error':
        return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Error</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const healthMetrics = [
    {
      title: 'System Status',
      value: getStatusBadge(healthData?.systemStatus || 'unknown'),
      description: `${healthData?.errorRatePct ?? 0}% of sessions errored in the selected range`,
      icon: Activity,
    },
    {
      title: 'Sessions',
      value: healthData?.recentSessions || 0,
      description: `${healthData?.distinctActiveUsers ?? 0} distinct users in range`,
      icon: Users,
    },
    {
      title: 'Query Latency',
      value: `${healthData?.queryLatencyMs ?? 0}ms`,
      description: 'Real DB round-trip time for this page\'s own query — not a hardcoded status',
      icon: Database,
    },
    {
      title: 'Errored Sessions',
      value: healthData?.outcomes.error ?? 0,
      description: 'interview_sessions.status = \'error\', in range',
      icon: AlertCircle,
    },
    {
      title: 'Last User Registration',
      value: healthData?.lastUserCreated
        ? `${Math.floor((Date.now() - healthData.lastUserCreated.getTime()) / (1000 * 60 * 60))}h ago`
        : 'No data',
      description: 'Time since last user signup',
      icon: Clock,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold mb-2">System Health</h2>
          <p className="text-muted-foreground">
            Monitor system performance and identify potential issues
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn('gap-1.5', isAllTime && 'text-muted-foreground')} disabled={isAllTime}>
                <CalendarIcon className="h-3.5 w-3.5" />
                {dateFrom ? format(dateFrom, 'd MMM yyyy') : 'All time'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar mode="single" selected={dateFrom ?? undefined} onSelect={(d) => d && setDateFrom(startOfDay(d))} disabled={(d) => d > dateTo} initialFocus />
            </PopoverContent>
          </Popover>
          <span className="text-sm text-muted-foreground">to</span>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
                <CalendarIcon className="h-3.5 w-3.5" />
                {format(dateTo, 'd MMM yyyy')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar mode="single" selected={dateTo} onSelect={(d) => d && setDateTo(d)} disabled={(d) => dateFrom !== null && d < dateFrom} initialFocus />
            </PopoverContent>
          </Popover>
          <Button
            variant={isAllTime ? 'default' : 'outline'}
            size="sm"
            onClick={() => (isAllTime
              ? setDateFrom(startOfDay(new Date(Date.now() - DEFAULT_RANGE_DAYS * 24 * 60 * 60 * 1000)))
              : setDateFrom(null))}
          >
            All time
          </Button>
        </div>
      </div>

      <LiveInterviews />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {healthMetrics.map((metric, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{metric.title}</CardTitle>
              <metric.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold mb-1">{metric.value}</div>
              <p className="text-xs text-muted-foreground">{metric.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Session outcomes {isAllTime ? '(all time)' : `(${format(dateFrom!, 'd MMM')} – ${format(dateTo, 'd MMM')})`}</CardTitle>
          <CardDescription>Real breakdown from interview_sessions.status, not a heuristic.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            {(['completed', 'error', 'abandoned', 'active'] as const).map((k) => (
              <div key={k}>
                <div className={`text-2xl font-bold ${k === 'error' ? 'text-destructive' : ''}`}>
                  {healthData?.outcomes[k] ?? 0}
                </div>
                <div className="text-xs text-muted-foreground capitalize">{k}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>System Recommendations</CardTitle>
          <CardDescription>
            Automated suggestions based on current system health
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {healthData?.systemStatus === 'healthy' && (
            <Alert className="border-green-200 bg-green-50 text-green-800 [&>svg]:text-green-600">
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>System running smoothly</AlertTitle>
              <AlertDescription className="text-green-700">All systems are operating normally. No action required.</AlertDescription>
            </Alert>
          )}

          {(healthData?.errorRatePct ?? 0) >= 10 && (
            <Alert variant={healthData!.errorRatePct >= 30 ? 'destructive' : 'default'} className={healthData!.errorRatePct < 30 ? 'border-yellow-200 bg-yellow-50 text-yellow-800 [&>svg]:text-yellow-600' : undefined}>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Elevated error rate</AlertTitle>
              <AlertDescription className={healthData!.errorRatePct < 30 ? 'text-yellow-700' : undefined}>
                {healthData!.errorRatePct}% of sessions ({healthData!.outcomes.error} of {Object.values(healthData!.outcomes).reduce((a, b) => a + b, 0)}) errored in the selected range. Worth investigating in the Interviews tab.
              </AlertDescription>
            </Alert>
          )}

          {(healthData?.recentSessions || 0) === 0 && (
            <Alert className="border-blue-200 bg-blue-50 text-blue-800 [&>svg]:text-blue-600">
              <Activity className="h-4 w-4" />
              <AlertTitle>Low activity period</AlertTitle>
              <AlertDescription className="text-blue-700">No sessions in the selected range. This might be normal during off-hours.</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
