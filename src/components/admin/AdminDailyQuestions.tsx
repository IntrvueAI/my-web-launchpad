import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Check } from 'lucide-react';

interface Opt { key: string; text: string; correct: boolean; reasoning: string; }
interface DailyRow {
  id: string; active_date: string; subject: string | null; title: string | null;
  question: string; options: Opt[]; explanation: string | null;
}

const db = () => (supabase as any).from('daily_questions');
const KEYS = ['A', 'B', 'C', 'D', 'E', 'F'];
const today = () => new Date().toISOString().slice(0, 10);
const blank = (): any => ({
  id: null, active_date: today(), subject: 'maths', title: '', question: '', explanation: '',
  options: [ { key: 'A', text: '', correct: true, reasoning: '' }, { key: 'B', text: '', correct: false, reasoning: '' },
             { key: 'C', text: '', correct: false, reasoning: '' }, { key: 'D', text: '', correct: false, reasoning: '' } ],
});

const Ta = (p: any) => (
  <textarea {...p} className={`w-full rounded-md border border-input bg-background p-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-primary ${p.className || ''}`} />
);

export const AdminDailyQuestions: React.FC = () => {
  const { toast } = useToast();
  const [rows, setRows] = useState<DailyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await db().select('*').order('active_date', { ascending: false });
    if (error) setError(error.message); else setRows((data ?? []) as DailyRow[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const set = (k: string, v: any) => setDraft((d: any) => ({ ...d, [k]: v }));
  const setOpt = (i: number, k: string, v: any) => setDraft((d: any) => {
    const options = d.options.map((o: Opt, j: number) =>
      k === 'correct' ? { ...o, correct: j === i } : j === i ? { ...o, [k]: v } : o);
    return { ...d, options };
  });
  const addOpt = () => setDraft((d: any) => ({ ...d, options: [...d.options, { key: KEYS[d.options.length] || '?', text: '', correct: false, reasoning: '' }] }));
  const removeOpt = (i: number) => setDraft((d: any) => ({ ...d, options: d.options.filter((_: any, j: number) => j !== i).map((o: Opt, j: number) => ({ ...o, key: KEYS[j] || o.key })) }));

  const save = async () => {
    if (!draft.active_date || !draft.question.trim()) { toast({ title: 'Date and question are required', variant: 'destructive' }); return; }
    if (!draft.options.some((o: Opt) => o.correct)) { toast({ title: 'Mark one option correct', variant: 'destructive' }); return; }
    setSaving(true);
    const payload = {
      active_date: draft.active_date, subject: draft.subject || null, title: draft.title || null,
      question: draft.question, explanation: draft.explanation || null,
      options: draft.options.map((o: Opt) => ({ key: o.key, text: o.text, correct: !!o.correct, reasoning: o.reasoning })),
    };
    // upsert on the unique active_date so re-authoring a day overwrites it
    const { error } = await db().upsert(draft.id ? { id: draft.id, ...payload } : payload, { onConflict: 'active_date' });
    setSaving(false);
    if (error) { toast({ title: 'Save failed', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Daily question saved' }); setDraft(null); load();
  };

  const del = async (id: string) => {
    const { error } = await db().delete().eq('id', id);
    if (error) toast({ title: 'Delete failed', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Deleted' }); load(); }
  };

  if (loading) return <p className="text-muted-foreground">Loading…</p>;
  if (error) return <p className="text-destructive">Failed to load: {error}</p>;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <CardTitle>Question of the Day</CardTitle>
              <CardDescription>The student page shows the most recent one whose date has arrived. Schedule future dates ahead of time.</CardDescription>
            </div>
            <Button onClick={() => setDraft(blank())} className="gap-2"><Plus className="w-4 h-4" /> New daily question</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border divide-y">
            {rows.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3 p-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline">{r.active_date}</Badge>
                    {r.subject && <Badge variant="secondary" className="text-[10px]">{r.subject}</Badge>}
                    <span className="font-medium truncate">{r.title || r.question}</span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-1">{r.question}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button size="sm" variant="ghost" onClick={() => setDraft({ ...r, options: r.options?.length ? r.options : blank().options })}><Pencil className="w-4 h-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => del(r.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </div>
              </div>
            ))}
            {rows.length === 0 && <p className="p-6 text-center text-muted-foreground">No daily questions yet.</p>}
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!draft} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{draft?.id ? 'Edit' : 'New'} daily question</DialogTitle></DialogHeader>
          {draft && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div><Label>Date</Label><Input type="date" value={draft.active_date} onChange={(e) => set('active_date', e.target.value)} /></div>
                <div><Label>Subject</Label><Input value={draft.subject} onChange={(e) => set('subject', e.target.value)} placeholder="maths" /></div>
                <div><Label>Title</Label><Input value={draft.title} onChange={(e) => set('title', e.target.value)} /></div>
              </div>
              <div><Label>Question</Label><Ta rows={2} value={draft.question} onChange={(e: any) => set('question', e.target.value)} /></div>
              <div className="space-y-2">
                <Label className="font-semibold">Options (click the ✓ to mark the correct one)</Label>
                {draft.options.map((o: Opt, i: number) => (
                  <div key={i} className="rounded-md border p-2 space-y-2">
                    <div className="flex items-center gap-2">
                      <Button type="button" size="sm" variant={o.correct ? 'default' : 'outline'} onClick={() => setOpt(i, 'correct', true)} className="h-7 px-2">{o.correct ? <Check className="w-4 h-4" /> : o.key}</Button>
                      <Input value={o.text} onChange={(e) => setOpt(i, 'text', e.target.value)} placeholder={`Option ${o.key} text`} />
                      {draft.options.length > 2 && <Button type="button" size="sm" variant="ghost" onClick={() => removeOpt(i)}><Trash2 className="w-4 h-4 text-destructive" /></Button>}
                    </div>
                    <Ta rows={2} value={o.reasoning} onChange={(e: any) => setOpt(i, 'reasoning', e.target.value)} placeholder={o.correct ? 'Why this is correct…' : 'Why this is wrong…'} className="text-xs" />
                  </div>
                ))}
                {draft.options.length < KEYS.length && <Button type="button" size="sm" variant="outline" onClick={addOpt} className="gap-1"><Plus className="w-3 h-3" /> Add option</Button>}
              </div>
              <div><Label>Overall takeaway (optional)</Label><Ta rows={2} value={draft.explanation} onChange={(e: any) => set('explanation', e.target.value)} /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDraft(null)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
