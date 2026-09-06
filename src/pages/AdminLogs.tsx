import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNowStrict } from 'date-fns';
import { useAdminStatus } from '@/hooks/useAdminStatus';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ScrollText, ChevronLeft, ChevronRight, RefreshCw, Copy, Check, Download,
  CircleAlert, TriangleAlert, Info, Layers,
} from 'lucide-react';

const PAGE_SIZE = 50;

const SINCE_OPTIONS: { value: string; label: string; hours: number | null }[] = [
  { value: '1h', label: 'Last hour', hours: 1 },
  { value: '24h', label: 'Last 24 hours', hours: 24 },
  { value: '7d', label: 'Last 7 days', hours: 24 * 7 },
  { value: '30d', label: 'Last 30 days', hours: 24 * 30 },
  { value: 'all', label: 'All time', hours: null },
];

const LEVEL_META: Record<string, { icon: typeof CircleAlert; badge: string; row: string; dot: string }> = {
  error: {
    icon: CircleAlert,
    badge: 'bg-destructive/15 text-destructive border-destructive/30',
    row: 'bg-destructive/[0.04] hover:bg-destructive/[0.07]',
    dot: 'text-destructive',
  },
  warn: {
    icon: TriangleAlert,
    badge: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
    row: 'bg-amber-500/[0.03] hover:bg-amber-500/[0.06]',
    dot: 'text-amber-500',
  },
  info: {
    icon: Info,
    badge: 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30',
    row: 'hover:bg-muted/50',
    dot: 'text-sky-500',
  },
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

interface LogGroup {
  key: string;
  latest: AppLogRow;
  occurrences: AppLogRow[];
}

/** Collapse consecutive/matching rows (same source+event_type+message) on the CURRENT page into
 *  one line with a count — the single biggest readability win for a noisy repeated failure, which
 *  is the common case (one broken thing retried, not fifty unrelated ones). Scoped to the page, not
 *  the whole filtered set, since real cross-page aggregation would need a DB-side GROUP BY. */
function groupRows(rows: AppLogRow[]): LogGroup[] {
  const map = new Map<string, LogGroup>();
  const order: string[] = [];
  for (const row of rows) {
    const key = `${row.source}::${row.event_type}::${row.message}`;
    const existing = map.get(key);
    if (existing) {
      existing.occurrences.push(row);
      if (new Date(row.created_at) > new Date(existing.latest.created_at)) existing.latest = row;
    } else {
      map.set(key, { key, latest: row, occurrences: [row] });
      order.push(key);
    }
  }
  return order.map((k) => map.get(k)!).sort((a, b) => new Date(b.latest.created_at).getTime() - new Date(a.latest.created_at).getTime());
}

function CopyableId({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className="inline-flex items-center gap-1 font-mono text-xs text-muted-foreground hover:text-foreground transition-colors"
      onClick={(e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(value).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        });
      }}
      title="Click to copy"
    >
      <span className="font-sans text-foreground/70">{label}:</span> {value}
      {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3 opacity-50" />}
    </button>
  );
}

function RelativeTime({ iso }: { iso: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="whitespace-nowrap text-xs text-muted-foreground cursor-default">
          {formatDistanceToNowStrict(new Date(iso), { addSuffix: true })}
        </span>
      </TooltipTrigger>
      <TooltipContent>{new Date(iso).toLocaleString()}</TooltipContent>
    </Tooltip>
  );
}

function GroupRow({ group }: { group: LogGroup }) {
  const [open, setOpen] = useState(false);
  const row = group.latest;
  const meta = LEVEL_META[row.level] ?? LEVEL_META.info;
  const Icon = meta.icon;
  const hasDetail = (row.metadata && Object.keys(row.metadata).length > 0) || group.occurrences.length > 1
    || row.user_id || row.interview_session_id || row.request_id;

  return (
    <>
      <TableRow className={`${meta.row} ${hasDetail ? 'cursor-pointer' : ''}`} onClick={() => hasDetail && setOpen((o) => !o)}>
        <TableCell><RelativeTime iso={row.created_at} /></TableCell>
        <TableCell>
          <Badge variant="outline" className={`${meta.badge} gap-1`}>
            <Icon className={`h-3 w-3 ${meta.dot}`} /> {row.level}
          </Badge>
        </TableCell>
        <TableCell className="whitespace-nowrap text-xs font-mono text-muted-foreground">{row.source}</TableCell>
        <TableCell className="whitespace-nowrap text-xs font-mono text-muted-foreground">{row.event_type}</TableCell>
        <TableCell className="max-w-md truncate text-sm">{row.message}</TableCell>
        <TableCell className="text-right">
          {group.occurrences.length > 1 && (
            <Badge variant="secondary" className="gap-1 font-normal">
              <Layers className="h-3 w-3" /> ×{group.occurrences.length}
            </Badge>
          )}
        </TableCell>
      </TableRow>
      {open && hasDetail && (
        <TableRow className={meta.row}>
          <TableCell colSpan={6} className="bg-muted/40">
            <div className="flex flex-wrap gap-x-5 gap-y-1.5 mb-3">
              {row.user_id && <CopyableId label="user" value={row.user_id} />}
              {row.interview_session_id && <CopyableId label="session" value={row.interview_session_id} />}
              {row.request_id && <CopyableId label="request" value={row.request_id} />}
            </div>
            {group.occurrences.length > 1 && (
              <p className="text-xs text-muted-foreground mb-2">
                Happened {group.occurrences.length} times on this page — most recently{' '}
                {formatDistanceToNowStrict(new Date(row.created_at), { addSuffix: true })}, first{' '}
                {formatDistanceToNowStrict(new Date(group.occurrences[group.occurrences.length - 1].created_at), { addSuffix: true })}.
              </p>
            )}
            {row.metadata && Object.keys(row.metadata).length > 0 && (
              <pre className="text-xs bg-background border rounded-md p-3 overflow-auto max-h-80">
                {JSON.stringify(row.metadata, null, 2)}
              </pre>
            )}
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

function StatChip({
  label, count, active, onClick, className,
}: { label: string; count: number | undefined; active: boolean; onClick: () => void; className?: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 min-w-[110px] rounded-lg border p-3 text-left transition-colors ${
        active ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
      }`}
    >
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-2xl font-bold tabular-nums ${className ?? ''}`}>
        {count === undefined ? <Skeleton className="h-7 w-12 mt-0.5" /> : count.toLocaleString()}
      </div>
    </button>
  );
}

function toCsv(rows: AppLogRow[]): string {
  const cols = ['created_at', 'level', 'source', 'event_type', 'message', 'user_id', 'interview_session_id', 'request_id'];
  const escape = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [cols.join(',')];
  for (const row of rows) lines.push(cols.map((c) => escape((row as any)[c])).join(','));
  return lines.join('\n');
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
  const [grouped, setGrouped] = useState(true);
  const [liveRefresh, setLiveRefresh] = useState(true);

  const sinceHours = useMemo(() => SINCE_OPTIONS.find((o) => o.value === since)?.hours ?? 24, [since]);
  const sinceIso = useMemo(
    () => (sinceHours !== null ? new Date(Date.now() - sinceHours * 60 * 60 * 1000).toISOString() : null),
    [sinceHours],
  );

  const applyCommonFilters = (query: any) => {
    if (source.trim()) query = query.ilike('source', `%${source.trim()}%`);
    if (eventType.trim()) query = query.ilike('event_type', `%${eventType.trim()}%`);
    if (sessionId.trim()) query = query.eq('interview_session_id', sessionId.trim());
    if (search.trim()) query = query.ilike('message', `%${search.trim()}%`);
    if (sinceIso) query = query.gte('created_at', sinceIso);
    return query;
  };

  const { data, isFetching, refetch } = useQuery({
    queryKey: ['admin-app-logs', level, source, eventType, sessionId, search, since, page],
    queryFn: async () => {
      let query = (supabase as any)
        .from('app_logs')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
      query = applyCommonFilters(query);
      if (level !== 'all') query = query.eq('level', level);

      const { data, error, count } = await query;
      if (error) throw error;
      return { rows: (data ?? []) as AppLogRow[], count: count ?? 0 };
    },
    enabled: isAdmin,
    refetchInterval: liveRefresh ? 15000 : false,
  });

  // Separate lightweight head-count query per level, scoped to every filter EXCEPT level itself,
  // so the stat strip always shows the full breakdown regardless of which chip is active.
  const { data: stats } = useQuery({
    queryKey: ['admin-app-logs-stats', source, eventType, sessionId, search, since],
    queryFn: async () => {
      const countFor = async (lvl: string) => {
        let query = (supabase as any).from('app_logs').select('id', { count: 'exact', head: true }).eq('level', lvl);
        query = applyCommonFilters(query);
        const { count } = await query;
        return count ?? 0;
      };
      const [error, warn, info] = await Promise.all([countFor('error'), countFor('warn'), countFor('info')]);
      return { error, warn, info, total: error + warn + info };
    },
    enabled: isAdmin,
    refetchInterval: liveRefresh ? 15000 : false,
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
  const groups = grouped ? groupRows(rows) : rows.map((r) => ({ key: r.id, latest: r, occurrences: [r] }));

  const handleExport = () => {
    const csv = toCsv(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `app_logs_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

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
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className={`h-1.5 w-1.5 rounded-full ${liveRefresh ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground/40'}`} />
              Live
              <Switch checked={liveRefresh} onCheckedChange={setLiveRefresh} />
            </div>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} /> Refresh
            </Button>
          </div>
        </div>

        <div className="flex gap-3 mb-4 flex-wrap">
          <StatChip label={`Events · ${SINCE_OPTIONS.find((o) => o.value === since)?.label.toLowerCase()}`} count={stats?.total} active={level === 'all'} onClick={() => { setLevel('all'); setPage(0); }} />
          <StatChip label="Errors" count={stats?.error} active={level === 'error'} onClick={() => { setLevel('error'); setPage(0); }} className={stats && stats.error > 0 ? 'text-destructive' : ''} />
          <StatChip label="Warnings" count={stats?.warn} active={level === 'warn'} onClick={() => { setLevel('warn'); setPage(0); }} className={stats && stats.warn > 0 ? 'text-amber-500' : ''} />
          <StatChip label="Info" count={stats?.info} active={level === 'info'} onClick={() => { setLevel('info'); setPage(0); }} />
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap space-y-0">
            <div>
              <CardTitle className="text-base">Filters</CardTitle>
              <CardDescription>{count.toLocaleString()} matching events</CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <Switch checked={grouped} onCheckedChange={setGrouped} /> Group repeats
              </label>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExport} disabled={rows.length === 0}>
                <Download className="h-3.5 w-3.5" /> Export page (CSV)
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
                    <TableHead className="w-28">Time</TableHead>
                    <TableHead className="w-24">Level</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead className="w-16" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isFetching && rows.length === 0 && Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={6}><Skeleton className="h-5 w-full" /></TableCell>
                    </TableRow>
                  ))}
                  {groups.map((g) => <GroupRow key={g.key} group={g} />)}
                </TableBody>
              </Table>
            </div>

            {rows.length === 0 && !isFetching && (
              <div className="text-center py-10 text-muted-foreground">
                <ScrollText className="h-8 w-8 mx-auto mb-2 opacity-30" />
                No events match these filters.
              </div>
            )}

            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                {count > 0 ? `Showing ${from}–${to} of ${count.toLocaleString()}` : ''}
                {grouped && rows.length > 0 && ` · ${groups.length} unique on this page`}
              </span>
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
