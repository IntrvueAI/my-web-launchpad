import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAdminStatus } from '@/hooks/useAdminStatus';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollText, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';

const PAGE_SIZE = 50;

const SINCE_OPTIONS: { value: string; label: string; hours: number | null }[] = [
  { value: '1h', label: 'Last hour', hours: 1 },
  { value: '24h', label: 'Last 24 hours', hours: 24 },
  { value: '7d', label: 'Last 7 days', hours: 24 * 7 },
  { value: '30d', label: 'Last 30 days', hours: 24 * 30 },
  { value: 'all', label: 'All time', hours: null },
];

const LEVEL_COLOR: Record<string, string> = {
  error: 'bg-destructive/15 text-destructive border-destructive/30',
  warn: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
  info: 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30',
};

interface AppLogRow {
  id: string;
  created_at: string;
  level: 'info' | 'warn' | 'error';
  source: string;
  event_type: string;
  message: string;
  user_id: string | null;
  interview_session_id: string | null;
  request_id: string | null;
  metadata: Record<string, unknown>;
}

function LogRow({ row }: { row: AppLogRow }) {
  const [open, setOpen] = useState(false);
  const hasDetail = row.metadata && Object.keys(row.metadata).length > 0;
  return (
    <>
      <TableRow className={hasDetail ? 'cursor-pointer' : undefined} onClick={() => hasDetail && setOpen((o) => !o)}>
        <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
          {new Date(row.created_at).toLocaleString()}
        </TableCell>
        <TableCell>
          <Badge variant="outline" className={LEVEL_COLOR[row.level] ?? ''}>{row.level}</Badge>
        </TableCell>
        <TableCell className="whitespace-nowrap text-xs font-mono">{row.source}</TableCell>
        <TableCell className="whitespace-nowrap text-xs">{row.event_type}</TableCell>
        <TableCell className="max-w-md truncate text-sm">{row.message}</TableCell>
      </TableRow>
      {open && hasDetail && (
        <TableRow>
          <TableCell colSpan={5} className="bg-muted/30">
            <div className="grid gap-1 text-xs text-muted-foreground mb-2 sm:grid-cols-3">
              {row.user_id && <div><span className="font-medium text-foreground">user_id:</span> {row.user_id}</div>}
              {row.interview_session_id && <div><span className="font-medium text-foreground">session:</span> {row.interview_session_id}</div>}
              {row.request_id && <div><span className="font-medium text-foreground">request:</span> {row.request_id}</div>}
            </div>
            <pre className="text-xs bg-background border rounded-md p-3 overflow-auto max-h-80">
              {JSON.stringify(row.metadata, null, 2)}
            </pre>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

export default function AdminLogs() {
  const { isAdmin, isLoading } = useAdminStatus();
  const [level, setLevel] = useState<string>('all');
  const [source, setSource] = useState('');
  const [eventType, setEventType] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [search, setSearch] = useState('');
  const [since, setSince] = useState('24h');
  const [page, setPage] = useState(0);

  const sinceHours = useMemo(() => SINCE_OPTIONS.find((o) => o.value === since)?.hours ?? 24, [since]);

  const { data, isFetching, refetch } = useQuery({
    queryKey: ['admin-app-logs', level, source, eventType, sessionId, search, since, page],
    queryFn: async () => {
      let query = (supabase as any)
        .from('app_logs')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

      if (level !== 'all') query = query.eq('level', level);
      if (source.trim()) query = query.ilike('source', `%${source.trim()}%`);
      if (eventType.trim()) query = query.ilike('event_type', `%${eventType.trim()}%`);
      if (sessionId.trim()) query = query.eq('interview_session_id', sessionId.trim());
      if (search.trim()) query = query.ilike('message', `%${search.trim()}%`);
      if (sinceHours !== null) {
        query = query.gte('created_at', new Date(Date.now() - sinceHours * 60 * 60 * 1000).toISOString());
      }

      const { data, error, count } = await query;
      if (error) throw error;
      return { rows: (data ?? []) as AppLogRow[], count: count ?? 0 };
    },
    enabled: isAdmin,
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4 text-center">
        <p className="text-muted-foreground">Admin access required.</p>
      </div>
    );
  }

  const rows = data?.rows ?? [];
  const count = data?.count ?? 0;
  const from = count === 0 ? 0 : page * PAGE_SIZE + 1;
  const to = Math.min(count, page * PAGE_SIZE + PAGE_SIZE);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-6">
          <div>
            <h1 className="text-2xl font-bold mb-1 flex items-center gap-2"><ScrollText className="h-5 w-5" /> Logs</h1>
            <p className="text-muted-foreground text-sm">
              Every client error and edge function call/failure across the whole app — durable and
              searchable, not just what happens while you're watching. Paste a session id to pull
              one interview's full trail.
            </p>
          </div>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Filters</CardTitle>
            <CardDescription>{count.toLocaleString()} matching events</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <Select value={level} onValueChange={(v) => { setLevel(v); setPage(0); }}>
                <SelectTrigger><SelectValue placeholder="Level" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All levels</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                  <SelectItem value="warn">Warn</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                </SelectContent>
              </Select>
              <Select value={since} onValueChange={(v) => { setSince(v); setPage(0); }}>
                <SelectTrigger><SelectValue placeholder="Since" /></SelectTrigger>
                <SelectContent>
                  {SINCE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input placeholder="Source (e.g. edge:stripe-webhook)" value={source} onChange={(e) => { setSource(e.target.value); setPage(0); }} />
              <Input placeholder="Event type (e.g. unhandled_exception)" value={eventType} onChange={(e) => { setEventType(e.target.value); setPage(0); }} />
              <Input placeholder="Interview session id" value={sessionId} onChange={(e) => { setSessionId(e.target.value); setPage(0); }} />
            </div>
            <Input placeholder="Search message text…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} />

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead>Message</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => <LogRow key={row.id} row={row} />)}
                </TableBody>
              </Table>
            </div>

            {rows.length === 0 && !isFetching && (
              <div className="text-center py-8 text-muted-foreground">No events match these filters.</div>
            )}

            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>{count > 0 ? `Showing ${from}–${to} of ${count.toLocaleString()}` : ''}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} className="gap-1">
                  <ChevronLeft className="h-4 w-4" /> Prev
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={to >= count} className="gap-1">
                  Next <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
