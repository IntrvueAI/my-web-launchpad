import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Search, Star } from 'lucide-react';

interface QRow {
  id: string; subject: string; topic: string; question_type: string | null;
  difficulty: number; title: string | null; question: string; answer: string | null;
  model_reasoning_path: string | null; rubric: any; common_mistakes: any; live_probes: any;
  hints: any; tags: string[] | null; active: boolean; warmup: boolean; created_at: string | null;
}

const db = () => (supabase as any).from('questions');
const stars = (n: number) => '★'.repeat(Math.max(0, n)) + '☆'.repeat(Math.max(0, 5 - n));
const blankDraft = (): any => ({
  id: '', subject: 'maths', topic: '', question_type: '', difficulty: 3, title: '',
  question: '', answer: '', model_reasoning_path: '',
  rubric_strong: '', rubric_developing: '', rubric_weak: '', rubric_final: '',
  common_mistakes_json: '[]', live_probes_json: '[]', hints_text: '', tags_csv: '', active: true, warmup: true,
});

const rowToDraft = (r: QRow): any => ({
  id: r.id, subject: r.subject, topic: r.topic, question_type: r.question_type || '',
  difficulty: r.difficulty, title: r.title || '', question: r.question, answer: r.answer || '',
  model_reasoning_path: r.model_reasoning_path || '',
  rubric_strong: r.rubric?.strong || '', rubric_developing: r.rubric?.developing || '',
  rubric_weak: r.rubric?.weak || '', rubric_final: r.rubric?.finalAnswerNote || '',
  common_mistakes_json: JSON.stringify(r.common_mistakes ?? [], null, 2),
  live_probes_json: JSON.stringify(r.live_probes ?? [], null, 2),
  hints_text: (r.hints ?? []).join('\n'),
  tags_csv: (r.tags ?? []).join(', '), active: r.active, warmup: r.warmup ?? true,
});

const Ta = (p: any) => (
  <textarea {...p} className={`w-full rounded-md border border-input bg-background p-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-primary ${p.className || ''}`} />
);

export const AdminQuestions: React.FC = () => {
  const { toast } = useToast();
  const [rows, setRows] = useState<QRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [addedAfter, setAddedAfter] = useState('');
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState<any | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await db().select('*').order('created_at', { ascending: false }).order('subject');
    if (error) setError(error.message);
    else setRows((data ?? []) as QRow[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const subjects = useMemo(() => [...new Set(rows.map((r) => r.subject))], [rows]);
  const filtered = rows.filter((r) => {
    if (subjectFilter !== 'all' && r.subject !== subjectFilter) return false;
    if (addedAfter && (!r.created_at || r.created_at.slice(0, 10) < addedAfter)) return false;
    if (!search) return true;
    const s = search.toLowerCase();
    return [r.title, r.question, r.topic, r.question_type, ...(r.tags || [])]
      .some((v) => (v || '').toString().toLowerCase().includes(s));
  });

  const openNew = () => { setDraft(blankDraft()); setIsNew(true); };
  const openEdit = (r: QRow) => { setDraft(rowToDraft(r)); setIsNew(false); };
  const set = (k: string, v: any) => setDraft((d: any) => ({ ...d, [k]: v }));

  const save = async () => {
    if (!draft.id.trim() || !draft.subject.trim() || !draft.topic.trim() || !draft.question.trim()) {
      toast({ title: 'id, subject, topic and question are required', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const hasRubric = draft.rubric_strong || draft.rubric_developing || draft.rubric_weak;
    const rowData = {
      id: draft.id.trim(), subject: draft.subject.trim(), topic: draft.topic.trim(),
      question_type: draft.question_type || null, difficulty: Number(draft.difficulty) || 3,
      title: draft.title || null, question: draft.question, answer: draft.answer || null,
      model_reasoning_path: draft.model_reasoning_path || null,
      rubric: hasRubric ? { strong: draft.rubric_strong, developing: draft.rubric_developing, weak: draft.rubric_weak, finalAnswerNote: draft.rubric_final || undefined } : null,
      hints: draft.hints_text.split('\n').map((h: string) => h.trim()).filter(Boolean),
      tags: draft.tags_csv.split(',').map((t: string) => t.trim()).filter(Boolean),
      active: !!draft.active, warmup: !!draft.warmup,
    };
    const { error } = await db().upsert(rowData);
    setSaving(false);
    if (error) { toast({ title: 'Save failed', description: error.message, variant: 'destructive' }); return; }
    toast({ title: isNew ? 'Question added' : 'Question saved' });
    setDraft(null);
    load();
  };

  const doDelete = async () => {
    if (!deleteId) return;
    const { error } = await db().delete().eq('id', deleteId);
    if (error) toast({ title: 'Delete failed', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Question deleted' }); load(); }
    setDeleteId(null);
  };

  if (loading) return <p className="text-muted-foreground">Loading questions…</p>;
  if (error) return <p className="text-destructive">Failed to load questions: {error} (are you a real admin, and has the questions table been created?)</p>;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <CardTitle>Question bank</CardTitle>
              <CardDescription>{rows.length} questions. Edits here go live in interviews.</CardDescription>
            </div>
            <Button onClick={openNew} className="gap-2"><Plus className="w-4 h-4" /> Add question</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input placeholder="Search title, question, topic, tag…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
            </div>
            <select value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)} className="rounded-md border border-input bg-background px-3 text-sm">
              <option value="all">All subjects</option>
              {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <div className="flex items-center gap-1.5 text-sm">
              <span className="text-muted-foreground whitespace-nowrap">Added after</span>
              <Input type="date" value={addedAfter} onChange={(e) => setAddedAfter(e.target.value)} className="w-[150px]" />
              {addedAfter && <button onClick={() => setAddedAfter('')} className="text-xs text-muted-foreground hover:text-foreground">clear</button>}
            </div>
          </div>

          <div className="rounded-md border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50 text-left">
                <tr><th className="p-2">Title</th><th className="p-2">Subject</th><th className="p-2">Type</th><th className="p-2">★</th><th className="p-2">Added</th><th className="p-2">Tags</th><th className="p-2">On</th><th className="p-2"></th></tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-b hover:bg-muted/30">
                    <td className="p-2">
                      <div className="font-medium">{r.title || r.id}</div>
                      <div className="text-xs text-muted-foreground line-clamp-1 max-w-md">{r.question}</div>
                    </td>
                    <td className="p-2 text-muted-foreground">{r.subject}</td>
                    <td className="p-2 text-muted-foreground">{r.question_type}</td>
                    <td className="p-2 text-yellow-500 whitespace-nowrap" title={`${r.difficulty} stars`}>{stars(r.difficulty)}</td>
                    <td className="p-2 text-muted-foreground whitespace-nowrap text-xs">{r.created_at ? new Date(r.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'}</td>
                    <td className="p-2">
                      <div className="flex flex-wrap gap-1">{(r.tags || []).map((t) => <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>)}</div>
                    </td>
                    <td className="p-2">{r.active ? <Badge className="bg-green-500 text-white text-[10px]">on</Badge> : <Badge variant="outline" className="text-[10px]">off</Badge>}</td>
                    <td className="p-2">
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => openEdit(r)}><Pencil className="w-4 h-4" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => setDeleteId(r.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">No questions match.</td></tr>}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit dialog */}
      <Dialog open={!!draft} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{isNew ? 'Add question' : 'Edit question'}</DialogTitle></DialogHeader>
          {draft && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>ID</Label><Input value={draft.id} disabled={!isNew} onChange={(e) => set('id', e.target.value)} placeholder="e.g. MA-A8" /></div>
                <div>
                  <Label>Difficulty</Label>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button key={n} type="button" onClick={() => set('difficulty', n)} aria-label={`${n} star${n > 1 ? 's' : ''}`} className="p-0.5">
                        <Star className={`h-6 w-6 transition-colors ${n <= Number(draft.difficulty) ? 'fill-amber text-amber' : 'text-muted-foreground/40'}`} />
                      </button>
                    ))}
                    <span className="ml-2 text-sm text-muted-foreground">{Number(draft.difficulty)} of 5 ({['', 'easiest', 'easy', 'medium', 'hard', 'hardest'][Number(draft.difficulty)] || ''})</span>
                  </div>
                </div>
                <div><Label>Subject</Label><Input value={draft.subject} onChange={(e) => set('subject', e.target.value)} placeholder="maths | logic | currentaffairs" /></div>
                <div><Label>Topic (folder id)</Label><Input value={draft.topic} onChange={(e) => set('topic', e.target.value)} placeholder="e.g. numerical-reasoning" /></div>
                <div><Label>Question type</Label><Input value={draft.question_type} onChange={(e) => set('question_type', e.target.value)} placeholder="e.g. Numerical" /></div>
                <div><Label>Title</Label><Input value={draft.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Digit Reversal" /></div>
              </div>
              <div><Label>Question (read verbatim)</Label><Ta rows={2} value={draft.question} onChange={(e: any) => set('question', e.target.value)} /></div>
              <div><Label>Answer (private — never spoken)</Label><Input value={draft.answer} onChange={(e) => set('answer', e.target.value)} /></div>
              <div><Label>Model reasoning path</Label><Ta rows={3} value={draft.model_reasoning_path} onChange={(e: any) => set('model_reasoning_path', e.target.value)} /></div>
              <div className="grid grid-cols-1 gap-2">
                <Label className="font-semibold">Rubric</Label>
                <Ta rows={2} value={draft.rubric_strong} onChange={(e: any) => set('rubric_strong', e.target.value)} placeholder="Strong — …" />
                <Ta rows={2} value={draft.rubric_developing} onChange={(e: any) => set('rubric_developing', e.target.value)} placeholder="Developing — …" />
                <Ta rows={2} value={draft.rubric_weak} onChange={(e: any) => set('rubric_weak', e.target.value)} placeholder="Weak — …" />
                <Input value={draft.rubric_final} onChange={(e) => set('rubric_final', e.target.value)} placeholder="Final answer note (optional)" />
              </div>
              <div><Label>Hints (one per line, gentle → near-reveal)</Label><Ta rows={3} value={draft.hints_text} onChange={(e: any) => set('hints_text', e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-3 items-end">
                <div><Label>Tags (comma-separated)</Label><Input value={draft.tags_csv} onChange={(e) => set('tags_csv', e.target.value)} placeholder="e.g. algebra, hard" /></div>
                <div className="flex flex-col gap-1 pb-1">
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={draft.active} onChange={(e) => set('active', e.target.checked)} className="h-4 w-4" /> Active (used in interviews)</label>
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={draft.warmup} onChange={(e) => set('warmup', e.target.checked)} className="h-4 w-4" /> Allow as warm-up</label>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDraft(null)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this question?</AlertDialogTitle>
            <AlertDialogDescription>This removes it from the live bank. This can't be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={doDelete} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
