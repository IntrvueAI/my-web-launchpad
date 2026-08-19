import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAdminStatus } from '@/hooks/useAdminStatus';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ExternalLink } from 'lucide-react';
import { useSchoolsData } from '@/hooks/useSchoolsData';

/**
 * Admin-only school finder: pick a UK independent school, see whatever admissions/interview timing
 * info was found for it, and jump to the school's own site. Reads a static JSON file built by a
 * research pass (public/data/uk-schools-interviews.json) rather than a live scrape on every visit —
 * that data is a point-in-time aggregation and should be double-checked against the school's own
 * site before relying on it. Not linked anywhere public — reached via /admin/school-finder.
 */


export default function AdminSchoolFinder() {
  const { isAdmin, isLoading } = useAdminStatus();
  const { schools, error } = useSchoolsData();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<SchoolEntry | null>(null);

  const filtered = useMemo(() => {
    if (!schools) return [];
    const q = query.trim().toLowerCase();
    if (!q) return schools.slice(0, 50);
    return schools.filter((s) => s.name.toLowerCase().includes(q) || s.region?.toLowerCase().includes(q)).slice(0, 50);
  }, [schools, query]);

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
        <div>
          <p className="text-muted-foreground mb-3">Admin access required.</p>
          <Link to="/admin" className="text-primary underline">Go to /admin</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">UK school finder</h1>
            <p className="text-sm text-muted-foreground">Pick a school to see admissions/interview timing, if we found it.</p>
          </div>
          <Link to="/admin" className="text-sm text-primary underline">← Back to admin</Link>
        </div>

        {error && !schools && (
          <Card className="p-6 text-center text-muted-foreground">
            {error} This is populated by a background research pass — check back once it's finished, or ask for it to be re-run.
          </Card>
        )}

        {schools && (
          <>
            <Input
              placeholder="Search by school name or region…"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setSelected(null); }}
              className="mb-4"
            />
            <p className="text-xs text-muted-foreground mb-4">
              {schools.length} schools loaded{query ? ` · ${filtered.length} matching` : ''} — showing up to 50 at a time, narrow your search for more.
            </p>

            <div className="grid md:grid-cols-2 gap-4">
              <Card className="p-2 max-h-[60vh] overflow-y-auto">
                {filtered.map((s) => (
                  <button
                    key={s.name}
                    onClick={() => setSelected(s)}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm hover:bg-muted transition-colors ${selected?.name === s.name ? 'bg-muted font-semibold' : ''}`}
                  >
                    <div>{s.name}</div>
                    <div className="text-xs text-muted-foreground">{s.region}{s.type ? ` · ${s.type}` : ''}</div>
                  </button>
                ))}
                {filtered.length === 0 && (
                  <p className="text-sm text-muted-foreground p-3">No matches.</p>
                )}
              </Card>

              <Card className="p-5">
                {!selected ? (
                  <p className="text-sm text-muted-foreground">Select a school on the left to see its details.</p>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <h2 className="text-lg font-bold">{selected.name}</h2>
                      <p className="text-xs text-muted-foreground">
                        {selected.region}{selected.type ? ` · ${selected.type}` : ''}{selected.gender ? ` · ${selected.gender}` : ''}
                      </p>
                    </div>
                    {selected.notes && <p className="text-sm">{selected.notes}</p>}

                    {selected.interview ? (
                      <div className="rounded-lg border p-3 space-y-1 text-sm">
                        <div className="font-semibold text-xs uppercase tracking-wide text-muted-foreground mb-1">Admissions / interview timing</div>
                        {selected.interview.registrationDeadline && <div><b>Registration:</b> {selected.interview.registrationDeadline}</div>}
                        {selected.interview.examDate && <div><b>Entrance exam:</b> {selected.interview.examDate}</div>}
                        {selected.interview.interviewWindow && <div><b>Interviews:</b> {selected.interview.interviewWindow}</div>}
                        {selected.interview.notes && <div className="text-muted-foreground">{selected.interview.notes}</div>}
                        <div className="text-[11px] text-muted-foreground pt-1">Verify against the school's own site — dates change yearly.</div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">No admissions timing details found yet for this school.</p>
                    )}

                    <div className="flex gap-2 pt-2">
                      {selected.website && (
                        <Button size="sm" variant="outline" className="gap-1.5" asChild>
                          <a href={selected.website} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3.5 w-3.5" /> School site
                          </a>
                        </Button>
                      )}
                      {selected.admissionsUrl && (
                        <Button size="sm" className="gap-1.5" asChild>
                          <a href={selected.admissionsUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3.5 w-3.5" /> Admissions page
                          </a>
                        </Button>
                      )}
                    </div>
                    {selected.source && (
                      <p className="text-[11px] text-muted-foreground">Source: {selected.source}</p>
                    )}
                  </div>
                )}
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
