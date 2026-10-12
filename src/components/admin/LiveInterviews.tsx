import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, Radio, ShieldCheck } from 'lucide-react';

export const LIVE_WINDOW_MINUTES = 10;

// Progress fields only. engine_state also holds the transcript, answers and the
// candidate's name, so they are never requested — not merely hidden after download.
export const LIVE_SESSION_COLUMNS = [
  'id', 'user_id', 'interview_type', 'started_at', 'last_activity_at',
  'completed:engine_state->questionIndex', 'planned:engine_state->targetQuestions',
  'topic:engine_state->current->>topic',
].join(', ');

export interface LiveSessionRow {
  id: string;
  user_id: string | null;
  interview_type: string;
  started_at: string;
  last_activity_at: string | null;
  completed: number | null;
  planned: number | null;
  topic: string | null;
}

const humanize = (id: string) => {
  const words = id.replace(/[-_]+/g, ' ').trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
};

const duration = (ms: number) => {
  const mins = Math.max(0, Math.floor(ms / 60000));
  return mins < 1 ? 'under a minute' : mins === 1 ? '1 minute' : `${mins} minutes`;
};

export function summariseLiveSession(row: LiveSessionRow, now: number) {
  const completed = Number.isFinite(row.completed) ? Number(row.completed) : null;
  const planned = Number.isFinite(row.planned) ? Number(row.planned) : null;
  const progress = completed === null ? 'Not started yet'
    : planned && completed >= planned ? `All ${planned} complete, closing`
    : planned ? `Part ${completed + 1} of ${planned}` : `${completed} completed`;
  return {
    interview: humanize(row.interview_type),
    progress,
    topic: row.topic ? humanize(row.topic) : null,
    running: duration(now - new Date(row.started_at).getTime()),
    lastActivity: row.last_activity_at ? `${duration(now - new Date(row.last_activity_at).getTime())} ago` : 'No activity yet',
    reference: row.id.slice(0, 8),
  };
}

export const LiveInterviews = () => {
  const [openId, setOpenId] = useState<string | null>(null);
  const { data, isError, refetch, dataUpdatedAt } = useQuery({
    queryKey: ['admin-live-interviews'],
    queryFn: async () => {
      const since = new Date(Date.now() - LIVE_WINDOW_MINUTES * 60 * 1000).toISOString();
      const { data: rows, error } = await supabase
        .from('interview_sessions')
        .select(LIVE_SESSION_COLUMNS)
        .eq('status', 'active')
        .gte('last_activity_at', since)
        .order('last_activity_at', { ascending: false });
      if (error) throw error;
      const sessions = (rows ?? []) as unknown as LiveSessionRow[];
      const ids = [...new Set(sessions.map((r) => r.user_id).filter(Boolean))] as string[];
      let emails: Record<string, string> = {};
      if (ids.length) {
        const { data: profiles } = await supabase.from('profiles').select('id, email').in('id', ids);
        emails = Object.fromEntries((profiles ?? []).map((p) => [p.id, p.email ?? '']));
      }
      return sessions.map((r) => ({ ...r, email: (r.user_id && emails[r.user_id]) || null }));
    },
    refetchInterval: 15000,
  });
  const now = dataUpdatedAt || Date.now();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Radio className="h-4 w-4 text-emerald-500" aria-hidden />
          Live right now
          {!!data?.length && <Badge variant="secondary">{data.length}</Badge>}
        </CardTitle>
        <CardDescription>
          Interviews active in the last {LIVE_WINDOW_MINUTES} minutes. Refreshes every 15s. Select one for its progress.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isError ? (
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-destructive">Could not load live interviews.</span>
            <Button size="sm" variant="outline" onClick={() => refetch()}>Retry</Button>
          </div>
        ) : !data ? (
          <div className="h-10 bg-muted animate-pulse rounded" />
        ) : !data.length ? (
          <p className="text-sm text-muted-foreground">Nobody mid-interview right now.</p>
        ) : (
          <ul className="divide-y">
            {data.map((row) => {
              const s = summariseLiveSession(row, now);
              const open = openId === row.id;
              return (
                <li key={row.id}>
                  <button
                    type="button"
                    className="w-full flex items-center justify-between gap-3 py-3 text-left text-sm rounded-sm hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-expanded={open}
                    aria-controls={`live-${row.id}`}
                    onClick={() => setOpenId(open ? null : row.id)}
                  >
                    <span className="flex min-w-0 flex-wrap items-center gap-2">
                      <span className="relative flex h-2 w-2 shrink-0" aria-hidden>
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                      </span>
                      <span className="font-medium truncate">{row.email ?? 'Account without email (e.g. beta guest)'}</span>
                      <Badge variant="secondary" className="text-[10px]">{row.interview_type}</Badge>
                    </span>
                    <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                      {s.progress}
                      <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
                    </span>
                  </button>
                  {open && (
                    <div id={`live-${row.id}`} className="mb-3 rounded-md border bg-muted/30 p-3 text-sm">
                      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
                        <dt className="text-muted-foreground">Interview</dt><dd>{s.interview}</dd>
                        <dt className="text-muted-foreground">Progress</dt><dd>{s.progress}</dd>
                        {s.topic && <><dt className="text-muted-foreground">Current topic</dt><dd>{s.topic}</dd></>}
                        <dt className="text-muted-foreground">Running for</dt><dd>{s.running}</dd>
                        <dt className="text-muted-foreground">Last activity</dt><dd>{s.lastActivity}</dd>
                        <dt className="text-muted-foreground">Session ref</dt><dd className="font-mono text-xs">{s.reference}</dd>
                      </dl>
                      <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
                        Answers and transcript stay private while the interview is in progress.
                      </p>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};
