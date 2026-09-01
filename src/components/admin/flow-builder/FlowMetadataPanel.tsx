import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import type { InterviewFlowRow } from '@/types/interviewFlow';
import type { FlowDraftInput } from '@/hooks/useInterviewFlowsAdmin';

interface FlowMetadataPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  flow: InterviewFlowRow;
  /** Return true on success, false on failure — the dialog only closes on success, so a failed
   *  save doesn't silently discard whatever the admin just typed. */
  onSave: (input: FlowDraftInput) => Promise<boolean>;
}

export function FlowMetadataPanel({ open, onOpenChange, flow, onSave }: FlowMetadataPanelProps) {
  const [name, setName] = useState(flow.name);
  const [description, setDescription] = useState(flow.description ?? '');
  const [domains, setDomains] = useState(flow.domains?.length === 4 ? flow.domains : ['', '', '', '']);
  const [scoringPhilosophy, setScoringPhilosophy] = useState(flow.scoring_philosophy ?? '');
  const [customInstructions, setCustomInstructions] = useState(flow.custom_instructions ?? '');
  const [costCredits, setCostCredits] = useState(flow.cost_credits);
  const [estimatedDuration, setEstimatedDuration] = useState(flow.estimated_duration);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(flow.name);
    setDescription(flow.description ?? '');
    setDomains(flow.domains?.length === 4 ? flow.domains : ['', '', '', '']);
    setScoringPhilosophy(flow.scoring_philosophy ?? '');
    setCustomInstructions(flow.custom_instructions ?? '');
    setCostCredits(flow.cost_credits);
    setEstimatedDuration(flow.estimated_duration);
  }, [open, flow]);

  const save = async () => {
    setSaving(true);
    const ok = await onSave({
      name: name.trim(),
      description: description.trim() || undefined,
      domains: domains.map((d) => d.trim()).filter(Boolean),
      scoring_philosophy: scoringPhilosophy.trim() || undefined,
      custom_instructions: customInstructions.trim() || undefined,
      cost_credits: Number(costCredits) || 1,
      estimated_duration: Number(estimatedDuration) || 20,
    });
    setSaving(false);
    if (ok) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Flow settings</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Name (shown to students once launched)</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Intrvue A" />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="One line shown on the interview picker card." className="min-h-[60px]" />
          </div>
          <div className="space-y-1.5">
            <Label>The 4 assessed domains (shown on the results page)</Label>
            {domains.map((d, i) => (
              <Input
                key={i}
                value={d}
                onChange={(e) => setDomains((prev) => prev.map((v, idx) => (idx === i ? e.target.value : v)))}
                placeholder={`Domain ${i + 1}`}
                className="mb-1.5"
              />
            ))}
          </div>
          <div className="space-y-1.5">
            <Label>Scoring philosophy (optional)</Label>
            <Textarea value={scoringPhilosophy} onChange={(e) => setScoringPhilosophy(e.target.value)} placeholder="How Clara should weigh reasoning vs. the final answer, what strong/developing/weak look like…" className="min-h-[80px]" />
          </div>
          <div className="space-y-1.5">
            <Label>Custom instructions for Clara (optional)</Label>
            <Textarea value={customInstructions} onChange={(e) => setCustomInstructions(e.target.value)} placeholder="Any flow-wide tone, pacing, or content guidance." className="min-h-[80px]" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Credit cost</Label>
              <Input type="number" min={0} value={costCredits} onChange={(e) => setCostCredits(Number(e.target.value))} />
            </div>
            <div className="space-y-1.5">
              <Label>Estimated duration (minutes)</Label>
              <Input type="number" min={1} value={estimatedDuration} onChange={(e) => setEstimatedDuration(Number(e.target.value))} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving || !name.trim()}>{saving ? 'Saving…' : 'Save'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
