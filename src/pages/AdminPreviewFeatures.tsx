import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, FlaskConical } from "lucide-react";
import { useAdminStatus } from "@/hooks/useAdminStatus";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PREVIEW_FEATURES, isPreviewFeatureOn, setPreviewFeature } from "@/lib/previewFeatures";

/** Founder-only switches for testing unapproved changes in this browser before approving them. */
export default function AdminPreviewFeatures() {
  const { isAdmin, isLoading } = useAdminStatus();
  const [, refresh] = useState(0);
  const toggle = (id: (typeof PREVIEW_FEATURES)[number]["id"], on: boolean) => {
    setPreviewFeature(id, on);
    refresh((n) => n + 1);
  };
  const reset = () => {
    for (const f of PREVIEW_FEATURES) setPreviewFeature(f.id, null);
    refresh((n) => n + 1);
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  if (!isAdmin) return <div className="min-h-screen flex items-center justify-center px-4 text-center"><p className="text-muted-foreground">Admin access required.</p></div>;

  return (
    <main className="min-h-screen bg-background px-4 py-6 sm:px-8 sm:py-9">
      <div className="mx-auto max-w-3xl">
        <Link to="/admin" className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" aria-hidden /> Back to admin
        </Link>
        <header className="mb-6 mt-4">
          <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary">
            <FlaskConical className="h-4 w-4" aria-hidden /> Test mode
          </p>
          <h1 className="font-display text-3xl font-semibold">Preview features</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            These changes are already on the site but switched off for everyone. Turning one on here affects
            <strong className="text-foreground"> only this browser</strong>, so you can try it on the live site.
            When you are happy with one, ask for it to be approved and it will be switched on for all users.
          </p>
        </header>
        <ul className="space-y-3">
          {PREVIEW_FEATURES.map((f) => {
            const on = isPreviewFeatureOn(f.id);
            return (
              <li key={f.id} className="rounded-2xl border bg-card p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold" id={`pf-${f.id}`}>{f.title}</h2>
                      <Badge variant={f.approved ? "default" : "outline"}>{f.approved ? "Approved for everyone" : "In testing"}</Badge>
                      {f.server && <Badge variant="secondary">Changes Clara's speech</Badge>}
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.change}</p>
                    <p className="mt-2 text-sm"><span className="font-medium">How to test: </span>{f.howToTest}</p>
                  </div>
                  <Switch checked={on} onCheckedChange={(v) => toggle(f.id, v)} aria-labelledby={`pf-${f.id}`} />
                </div>
              </li>
            );
          })}
        </ul>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
          <p>Changes that alter Clara's speech also need the latest interview server deployed.</p>
          <Button variant="outline" onClick={reset}>Reset to defaults</Button>
        </div>
      </div>
    </main>
  );
}
