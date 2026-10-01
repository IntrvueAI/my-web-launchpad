import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { MedicineTheme } from "@/components/medicine-dashboard/MedicineTheme";
import { Button } from "@/components/ui/button";
import {
  exportMedicineNotes,
  readMedicineBackup,
  importMedicineNotes,
  type MedicineBackup,
} from "@/lib/medicineTransfer";

export default function MedicineTransfer() {
  const { user, loading } = useAuth();
  const scope = user?.id || "guest";
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState<MedicineBackup | null>(null);
  function download() {
    try {
      const backup = exportMedicineNotes(localStorage, scope);
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(backup, null, 2)], {
          type: "application/json",
        }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = "mmi-practice-notes.json";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage(
        "Notes exported. Keep this file until you have restored them on the new website.",
      );
    } catch {
      setMessage(
        "Some saved notes could not be read. Your existing notes have not been changed.",
      );
    }
  }
  async function choose(file?: File) {
    setPending(null);
    setMessage("");
    if (!file) return;
    if (file.size > 2_000_000) {
      setMessage("Choose an export smaller than 2 MB.");
      return;
    }
    try {
      setPending(readMedicineBackup(await file.text(), scope));
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Unable to read the export.");
    }
  }
  function restore() {
    if (!pending) return;
    try {
      const count = importMedicineNotes(localStorage, scope, pending);
      setMessage(
        `Restored ${count} sets of notes. Existing worked-answer drafts were kept. Your studio history was merged.`,
      );
      setPending(null);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Unable to restore notes.");
    }
  }
  return (
    <MedicineTheme>
      <main className="min-h-screen bg-background px-5 py-10 pb-28 text-foreground">
        <div className="mx-auto max-w-2xl">
          <a href="/" className="font-semibold underline">
            ← Back to dashboard
          </a>
          <h1 className="mb-5 mt-10 font-display text-4xl font-semibold">
            Bring your practice notes with you.
          </h1>
          <p className="mb-5 text-muted-foreground">
            Your account, credits and saved AI interviews already use the same
            service. This page moves notes saved only in this browser: your
            practice studio, reflections, bookmarks and worked-answer drafts.
          </p>
          <ol className="mb-8 list-decimal space-y-3 pl-5">
            <li>Open this page on the old website and export your notes.</li>
            <li>Sign into the same account on MMI Practice.</li>
            <li>Open this page there, choose your file and restore it.</li>
          </ol>
          {loading ? (
            <p role="status">Checking your account…</p>
          ) : (
            <section
              key={scope}
              className="space-y-5 rounded-2xl border bg-card p-6"
            >
              <p className="text-sm">
                {user
                  ? "Moving notes for your signed-in account."
                  : "Moving notes written while signed out. Sign in first if your notes belong to your account."}
              </p>
              <Button onClick={download}>Export my Medicine notes</Button>
              <label className="block text-sm font-medium">
                Choose a Medicine notes export
                <input
                  className="mt-3 block w-full text-sm"
                  type="file"
                  accept=".json,application/json"
                  onChange={(e) => void choose(e.target.files?.[0])}
                />
              </label>
              {pending && (
                <div className="rounded-xl border p-4">
                  <p className="mb-3 text-sm">
                    {pending.examples.length} worked-answer drafts ·{" "}
                    {pending.profile?.attempts.length || 0} studio attempts ·{" "}
                    {pending.profile?.experiences.length || 0} reflections.
                    Existing drafts stay in place.
                  </p>
                  <Button onClick={restore}>Restore these notes</Button>
                </div>
              )}
            </section>
          )}
          {message && (
            <p role="status" className="mt-5 rounded-xl border p-4">
              {message}
            </p>
          )}
          <p className="mt-6 text-xs text-muted-foreground">
            The file contains your written notes. Store it privately. Passwords,
            sign-in tokens and payment information are never included.
          </p>
        </div>
      </main>
    </MedicineTheme>
  );
}
