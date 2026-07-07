import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface SessionRow {
  id: string;
  user_id: string;
  session_reference: string | null;
  interview_type: string | null;
  subject: string | null;
  mode: string | null;
  status: string | null;
  started_at: string;
  transcript: string | null;
}

const statusColor: Record<string, string> = {
  completed: 'bg-green-500',
  active: 'bg-blue-500',
  abandoned: 'bg-muted-foreground',
  error: 'bg-red-500',
  timed_out: 'bg-yellow-500',
};

/** Admin view of every interview taken (needs the admin-read RLS policy on interview_sessions). */
export const AdminInterviews: React.FC = () => {
  const [rows, setRows] = useState<SessionRow[]>([]);
  const [emails, setEmails] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewing, setViewing] = useState<{ email: string; when: string; text: string } | null>(null);

  const openTranscript = async (s: SessionRow) => {
    const email = emails[s.user_id] || s.user_id.slice(0, 8) + '…';
    const when = new Date(s.started_at).toLocaleString('en-GB');
    if (s.transcript) { setViewing({ email, when, text: s.transcript }); return; }
    // Older sessions saved the transcript only on the feedback row — fall back to that.
    let text = 'No transcript stored for this session.';
    if (s.session_reference) {
      const { data } = await supabase
        .from('feedback')
        .select('transcription')
        .eq('session_reference', s.session_reference)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if ((data as any)?.transcription) text = (data as any).transcription;
    }
    setViewing({ email, when, text });
  };

  useEffect(() => {
    (async () => {
      const { data, error } = await (supabase as any)
        .from('interview_sessions')
        .select('id, user_id, session_reference, interview_type, subject, mode, status, started_at, transcript')
        .order('started_at', { ascending: false })
        .limit(200);
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      const sessions = (data ?? []) as unknown as SessionRow[];
      setRows(sessions);
      const ids = [...new Set(sessions.map((s) => s.user_id).filter(Boolean))];
      if (ids.length) {
        const { data: profiles } = await supabase.from('profiles').select('id, email').in('id', ids);
        setEmails(Object.fromEntries((profiles ?? []).map((p: any) => [p.id, p.email])));
      }
      setLoading(false);
    })();
  }, []);

  if (loading) return <p className="text-muted-foreground">Loading interviews…</p>;
  if (error) return <p className="text-destructive">Failed to load interviews: {error}</p>;

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr className="text-left">
                <th className="p-3 font-medium">User</th>
                <th className="p-3 font-medium">Interview</th>
                <th className="p-3 font-medium">Mode</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium">Ref</th>
                <th className="p-3 font-medium">When</th>
                <th className="p-3 font-medium">Transcript</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id} className="border-b hover:bg-muted/30">
                  <td className="p-3">{emails[s.user_id] || <span className="text-muted-foreground font-mono text-xs">{s.user_id.slice(0, 8)}…</span>}</td>
                  <td className="p-3">{s.interview_type || s.subject || '—'}</td>
                  <td className="p-3 capitalize text-muted-foreground">{s.mode || '—'}</td>
                  <td className="p-3">
                    <Badge className={`${statusColor[s.status || ''] || 'bg-muted-foreground'} text-white text-xs`}>
                      {s.status || 'unknown'}
                    </Badge>
                  </td>
                  <td className="p-3 font-mono text-xs">{s.session_reference || '—'}</td>
                  <td className="p-3 text-muted-foreground">{new Date(s.started_at).toLocaleString('en-GB')}</td>
                  <td className="p-3">
                    <Button size="sm" variant="ghost" className="gap-1.5 h-8" onClick={() => openTranscript(s)}>
                      <FileText className="w-4 h-4" /> View
                    </Button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No interviews yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>

      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Transcript — {viewing?.email}</DialogTitle>
            <p className="text-xs text-muted-foreground">{viewing?.when}</p>
          </DialogHeader>
          <div className="overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed rounded-lg bg-muted/40 p-4">
            {viewing?.text}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
