import { Suspense, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, EyeOff, SlidersHorizontal, X } from 'lucide-react';
import { useAdminStatus } from '@/hooks/useAdminStatus';
import { MEDICINE_LANDING_DESIGNS, designIndexFrom } from '@/components/marketing/medicineLandingDesigns';

const bar = 'fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] w-[calc(100%-2rem)] max-w-3xl rounded-2xl border border-white/15 bg-[#0A1E2B]/95 text-white shadow-2xl backdrop-blur';
const control = 'inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg px-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#19B5CC] disabled:opacity-40';

/** Admin-only switcher for comparing Medicine landing designs on the real page layout. */
export default function AdminLandingPreviews() {
  const { isAdmin, isLoading } = useAdminStatus();
  const location = useLocation();
  const navigate = useNavigate();
  const [hidden, setHidden] = useState(false);
  const designs = MEDICINE_LANDING_DESIGNS;
  const index = designIndexFrom(location.search, designs.length);
  const design = designs[index];
  const go = (next: number) => {
    const clamped = (next + designs.length) % designs.length;
    navigate({ search: `?design=${clamped + 1}` }, { replace: true });
    window.scrollTo({ top: 0 });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.target instanceof Element && e.target.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (e.key === 'ArrowRight') go(index + 1);
      else if (e.key === 'ArrowLeft') go(index - 1);
      else if (/^[1-9]$/.test(e.key) && Number(e.key) <= designs.length) go(Number(e.key) - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  if (!isAdmin) return <div className="min-h-screen flex items-center justify-center px-4 text-center"><p className="text-muted-foreground">Admin access required.</p></div>;

  return (
    <>
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">Loading design…</div>}>
        <design.Component key={design.id} />
      </Suspense>

      {hidden ? (
        <button type="button" onClick={() => setHidden(false)} className={`fixed bottom-4 right-4 z-[100] gap-2 rounded-full bg-[#0A1E2B] px-4 text-white shadow-2xl ${control}`}>
          <SlidersHorizontal className="h-4 w-4" aria-hidden /> Preview {index + 1}/{designs.length}
        </button>
      ) : (
        <nav aria-label="Landing page designs" className={bar}>
          <div className="flex flex-wrap items-center gap-2 p-2">
            <button type="button" className={`${control} hover:bg-white/10`} onClick={() => go(index - 1)} aria-label="Previous design">
              <ChevronLeft className="h-5 w-5" aria-hidden />
            </button>
            <div className="flex flex-wrap gap-1" role="group" aria-label="Choose a design">
              {designs.map((d, i) => (
                <button key={d.id} type="button" onClick={() => go(i)} aria-pressed={i === index} title={d.name}
                  className={`${control} ${i === index ? 'bg-[#19B5CC] text-[#0A1E2B]' : 'bg-white/10 hover:bg-white/20'}`}>
                  {i + 1}
                </button>
              ))}
            </div>
            <button type="button" className={`${control} gap-1 hover:bg-white/10`} onClick={() => go(index + 1)} aria-label="Next design">
              Next <ChevronRight className="h-5 w-5" aria-hidden />
            </button>
            <div className="min-w-0 flex-1 px-1" aria-live="polite">
              <p className="truncate text-sm font-semibold">{index + 1}. {design.name}</p>
              <p className="truncate text-xs text-white/70">{design.note}</p>
            </div>
            <button type="button" className={`${control} hover:bg-white/10`} onClick={() => setHidden(true)} aria-label="Hide preview controls">
              <EyeOff className="h-4 w-4" aria-hidden />
            </button>
            <Link to="/admin" className={`${control} hover:bg-white/10`} aria-label="Exit to admin dashboard">
              <X className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </nav>
      )}
    </>
  );
}
