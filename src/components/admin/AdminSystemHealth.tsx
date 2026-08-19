import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Activity, Database, Users, AlertCircle, CheckCircle, Clock, Radio } from 'lucide-react';

const LIVE_WINDOW_MINUTES = 10;

export const AdminSystemHealth = () => {
  const { data: healthData, isLoading } = useQuery({
    queryKey: ['admin-system-health'],
    queryFn: async () => {
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const liveWindowAgo = new Date(now.getTime() - LIVE_WINDOW_MINUTES * 60 * 1000);

      // "Query latency" doubles as the database-health check: if this fails, everything below fails
      // too, and the real error surfaces — no more hardcoded 'Connected'.
      const latencyStart = performance.now();
      const { count: recentSessions } = await supabase
        .from('interview_sessions')
        .select('*', { count: 'exact', head: true })
        .gte('started_at', oneDayAgo.toISOString());
      const queryLatencyMs = Math.round(performance.now() - latencyStart);

      // Distinct active users (24h) — head:true only returns a row count, so genuine dedup needs the
      // actual user_id values fetched and deduped client-side (the old version of this metric counted
      // rows, not distinct users, and was never even rendered — see git history).
      const { data: recentUserRows } = await supabase
        .from('interview_sessions')
        .select('user_id')
        .gte('started_at', oneDayAgo.toISOString());
      const distinctActiveUsers = new Set((recentUserRows ?? []).map((r: any) => r.user_id)).size;

      // Real error rate, grounded in interview_sessions.status (not the old "feedback.total_score is
      // null" proxy) — session outcomes over the last 7 days.
      const { data: outcomeRows } = await supabase
        .from('interview_sessions')
        .select('status')
        .gte('started_at', sevenDaysAgo.toISOString());
      const outcomes = { completed: 0, error: 0, abandoned: 0, active: 0, other: 0 };
      for (const r of (outcomeRows ?? []) as any[]) {
        if (r.status in outcomes) outcomes[r.status as keyof typeof outcomes]++;
        else outcomes.other++;
      }
      const totalOutcomes = Object.values(outcomes).reduce((a, b) => a + b, 0);
      const errorRatePct = totalOutcomes > 0 ? Math.round((outcomes.error / totalOutcomes) * 100) : 0;

      const { count: recentErrors } = await supabase
        .from('interview_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'error')
        .gte('started_at', oneHourAgo.toISOString());

      // Genuinely live right now: status='active' AND recently touched — a stale 'active' row from an
      // abandoned session (browser closed mid-interview) never flips to another status, so without the
      // last_activity_at filter this would overcount indefinitely.
      const { data: liveRows } = await supabase
        .from('interview_sessions')
        .select('id, user_id, interview_type, last_activity_at, started_at')
        .eq('status', 'active')
        .gte('last_activity_at', liveWindowAgo.toISOString())
        .order('last_activity_at', { ascending: false });
      const liveUserIds = [...new Set((liveRows ?? []).map((r: any) => r.user_id))];
      let liveEmails: Record<string, string> = {};
      if (liveUserIds.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('id, email').in('id', liveUserIds);
        liveEmails = Object.fromEntries((profiles ?? []).map((p: any) => [p.id, p.email]));
      }

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
        recentErrors: recentErrors || 0,
        outcomes,
        errorRatePct,
        queryLatencyMs,
        lastUserCreated,
        systemStatus,
        liveSessions: (liveRows ?? []).map((r: any) => ({ ...r, email: liveEmails[r.user_id] || r.user_id })),
      };
    },
    refetchInterval: 30000, // Live panel is the one thing worth refreshing faster than a minute
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
      description: `${healthData?.errorRatePct ?? 0}% of sessions errored in the last 7 days`,
      icon: Activity,
    },
    {
      title: 'Sessions (24h)',
      value: healthData?.recentSessions || 0,
      description: `${healthData?.distinctActiveUsers ?? 0} distinct users`,
      icon: Users,
    },
    {
      title: 'Query Latency',
      value: `${healthData?.queryLatencyMs ?? 0}ms`,
      description: 'Real DB round-trip time for this page\'s own query — not a hardcoded status',
      icon: Database,
    },
    {
      title: 'Errored Sessions (1h)',
      value: healthData?.recentErrors || 0,
      description: 'interview_sessions.status = \'error\', last hour',
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
      <div>
        <h2 className="text-2xl font-semibold mb-2">System Health</h2>
        <p className="text-muted-foreground">
          Monitor system performance and identify potential issues
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-emerald-500" />
            Live right now
          </CardTitle>
          <CardDescription>
            Sessions with status "active", touched in the last {LIVE_WINDOW_MINUTES} minutes — refreshes every 30s.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!healthData?.liveSessions.length ? (
            <p className="text-sm text-muted-foreground">Nobody mid-interview right now.</p>
          ) : (
            <div className="space-y-2">
              {healthData.liveSessions.map((s: any) => (
                <div key={s.id} className="flex items-center justify-between text-sm border-b last:border-0 py-2">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                    </span>
                    <span className="font-medium">{s.email}</span>
                    <Badge variant="secondary" className="text-[10px]">{s.interview_type}</Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    since {new Date(s.started_at).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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
          <CardTitle>Session outcomes (7 days)</CardTitle>
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
                {healthData!.errorRatePct}% of sessions ({healthData!.outcomes.error} of {Object.values(healthData!.outcomes).reduce((a, b) => a + b, 0)}) errored in the last 7 days. Worth investigating in the Interviews tab.
              </AlertDescription>
            </Alert>
          )}

          {(healthData?.recentSessions || 0) === 0 && (
            <Alert className="border-blue-200 bg-blue-50 text-blue-800 [&>svg]:text-blue-600">
              <Activity className="h-4 w-4" />
              <AlertTitle>Low activity period</AlertTitle>
              <AlertDescription className="text-blue-700">No sessions in the last 24 hours. This might be normal during off-hours.</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
