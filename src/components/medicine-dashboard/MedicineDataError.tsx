export function MedicineDataError({ onRetry }: { onRetry: () => void }) {
  return (
    <section role="alert" className="rounded-2xl border bg-card p-6">
      <h2 className="text-lg font-semibold">We couldn’t load your Medicine feedback</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Check your connection and try again. Your saved interviews are still there.
      </p>
      <button onClick={onRetry} className="mt-4 min-h-11 rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground">
        Try again
      </button>
    </section>
  );
}
