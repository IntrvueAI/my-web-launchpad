import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SchoolClass } from "@/lib/schools";

export function ClassForm({
  initial,
  busy,
  onSubmit,
}: {
  initial?: Pick<SchoolClass, "name" | "year_group" | "weekly_target">;
  busy: boolean;
  onSubmit: (data: {
    name: string;
    year_group: string;
    weekly_target: number;
  }) => Promise<unknown>;
}) {
  const [name, setName] = useState(initial?.name || "");
  const [year, setYear] = useState(initial?.year_group || "Year 5");
  const [target, setTarget] = useState(initial?.weekly_target || 2);
  async function submit(e: FormEvent) {
    e.preventDefault();
    try {
      await onSubmit({
        name: name.trim(),
        year_group: year.trim(),
        weekly_target: target,
      });
    } catch {
      /* Parent renders the request error. */
    }
  }
  return (
    <form onSubmit={submit}>
      <fieldset disabled={busy} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="class-name">Class name</Label>
          <Input
            id="class-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Year 5 interview club"
            minLength={2}
            maxLength={80}
            required
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="class-year">Year group</Label>
            <Input
              id="class-year"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              maxLength={40}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="class-target">Weekly interview target</Label>
            <Input
              id="class-target"
              type="number"
              min={1}
              max={10}
              step={1}
              value={target}
              onChange={(e) => setTarget(Number(e.target.value))}
              required
            />
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          A suggested number of completed interviews per pupil, Monday–Sunday in
          UK time. Each interview uses the pupil’s existing credits.
        </p>
        <Button type="submit" className="min-h-11">
          {busy ? "Saving…" : initial ? "Save class settings" : "Create class"}
        </Button>
      </fieldset>
    </form>
  );
}
