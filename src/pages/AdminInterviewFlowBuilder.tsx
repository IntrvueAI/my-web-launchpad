import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAdminStatus } from '@/hooks/useAdminStatus';
import { useInterviewFlowsAdmin, type FlowDraftInput } from '@/hooks/useInterviewFlowsAdmin';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Pencil, Copy, Trash2, Workflow } from 'lucide-react';
import type { InterviewFlowRow } from '@/types/interviewFlow';

const blankDraft: FlowDraftInput = {
  name: '',
  description: '',
  domains: ['', '', '', ''],
  cost_credits: 1,
  estimated_duration: 20,
};

export default function AdminInterviewFlowBuilder() {
  const { isAdmin, isLoading } = useAdminStatus();
  const { flows, loading, error, create, duplicate, remove } = useInterviewFlowsAdmin();
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<FlowDraftInput>(blankDraft);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

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
  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4 text-center">
        <p className="text-destructive max-w-md">
          Failed to load flows: {error} (has the interview_flows migration been applied yet?)
        </p>
      </div>
    );
  }

  const handleCreate = async () => {
    setSaving(true);
    const row = await create(draft);
    setSaving(false);
    if (row) {
      setCreating(false);
      setDraft(blankDraft);
      window.location.href = `/admin/interview-flow-builder/${row.id}`;
    }
  };

  const questionCount = (flow: InterviewFlowRow) => (flow.graph?.nodes ?? []).filter((n) => n.type === 'question').length;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-6">
          <div>
            <h1 className="text-2xl font-bold mb-1 flex items-center gap-2"><Workflow className="h-5 w-5" /> Interview flow builder</h1>
            <p className="text-muted-foreground text-sm">
              Design custom interviews as a flowchart of existing questions with branching. Nothing here is live —
              a flow only reaches real students once it's manually launched.
            </p>
          </div>
          <Button onClick={() => setCreating(true)} className="gap-2"><Plus className="h-4 w-4" /> New flow</Button>
        </div>

        {loading && <p className="text-muted-foreground">Loading flows…</p>}
        {!loading && flows.length === 0 && (
          <Card><CardContent className="p-8 text-center text-muted-foreground">No flows yet — create your first one.</CardContent></Card>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          {flows.map((flow) => (
            <Card key={flow.id}>
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-lg">{flow.name}</CardTitle>
                  <Badge variant={flow.status === 'ready' ? 'default' : 'outline'}>{flow.status === 'ready' ? 'Ready' : 'Draft'}</Badge>
                </div>
                {flow.description && <CardDescription>{flow.description}</CardDescription>}
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  {questionCount(flow)} question{questionCount(flow) === 1 ? '' : 's'} · updated {new Date(flow.updated_at).toLocaleDateString()}
                </p>
                <div className="flex gap-2 flex-wrap">
                  <Button asChild size="sm" variant="secondary" className="gap-1.5">
                    <Link to={`/admin/interview-flow-builder/${flow.id}`}><Pencil className="h-3.5 w-3.5" /> Edit</Link>
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => duplicate(flow)}>
                    <Copy className="h-3.5 w-3.5" /> Duplicate
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1.5 text-destructive hover:text-destructive" onClick={() => setDeleteId(flow.id)}>
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent>
          <DialogHeader><DialogTitle>New interview flow</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} placeholder="Intrvue A" />
            </div>
            <p className="text-xs text-muted-foreground">You can fill in the rest of the details (description, domains, custom instructions) from inside the editor.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreating(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving || !draft.name.trim()}>{saving ? 'Creating…' : 'Create & open editor'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this flow?</AlertDialogTitle>
            <AlertDialogDescription>This can't be undone. If it's already launched as a real interview type, unpublishing it in code is a safer option than deleting it here.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (deleteId) remove(deleteId); setDeleteId(null); }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
