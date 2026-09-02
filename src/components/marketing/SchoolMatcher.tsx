import { useMemo, useState } from 'react';
import { listSchools, type SchoolRoute } from '@/interview/medicine-content';

/**
 * The one genuinely interactive piece of the /medicine marketing page — real data (68 UK
 * course-routes, each checked against the institution's own admissions page), searched client-side.
 * Styled to match medicine.html's bespoke dark/coral palette directly (hex values, not the app's
 * Tailwind tokens) since it's portaled into the middle of that static page, not the app shell.
 */
const INK = '#F3F6FB';
const MUTED = '#A6AFC1';
const CARD = '#151C2E';
const LINE = 'rgba(255,255,255,.09)';

function recommendMode(school: SchoolRoute): { label: string; note: string } {
  if (school.prep_time_min === 0) {
    return { label: 'Manchester-style', note: 'This school publishes zero reading time — the closest real match is our no-prep, cold-start mode.' };
  }
  if (typeof school.prep_time_min === 'number' && school.prep_time_min > 0) {
    return { label: 'Leeds-style', note: `This school gives ${school.prep_time_min} minute${school.prep_time_min === 1 ? '' : 's'} of reading time — closer to our Leeds-style mode than a cold start.` };
  }
  return { label: 'Try both', note: "This school hasn't published its reading-time policy, so we can't say for certain — Leeds-style is the safer default, since most schools that DO publish detail give some prep time." };
}

function formatField(v: string | number | boolean | null | undefined): string {
  if (v === null || v === undefined) return 'not published';
  if (v === true) return 'yes';
  if (v === false) return 'no';
  return String(v);
}

function SchoolCard({ school }: { school: SchoolRoute }) {
  const rec = recommendMode(school);
  return (
    <div style={{ background: CARD, border: `1px solid ${LINE}`, borderRadius: 20, padding: 24, textAlign: 'left' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontFamily: "'Bricolage Grotesque',serif", fontWeight: 700, fontSize: 18, color: INK }}>{school.university}</div>
          <div style={{ fontSize: 13, color: MUTED, marginTop: 2 }}>{school.code} · {school.route}</div>
        </div>
        <a href={school.source_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, whiteSpace: 'nowrap' }}>source ↗</a>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginTop: 16, fontSize: 13.5 }}>
        <div><span style={{ color: MUTED }}>Stations: </span><span style={{ color: INK }}>{formatField(school.stations)}</span></div>
        <div><span style={{ color: MUTED }}>Station length: </span><span style={{ color: INK }}>{school.station_length_min ? `${school.station_length_min} min` : 'not published'}</span></div>
        <div><span style={{ color: MUTED }}>Reading time: </span><span style={{ color: INK }}>{school.prep_time_min === null ? 'not published' : school.prep_time_min === 0 ? 'none' : `${school.prep_time_min} min`}</span></div>
        <div><span style={{ color: MUTED }}>Roleplay: </span><span style={{ color: INK }}>{formatField(school.roleplay)}</span></div>
        <div><span style={{ color: MUTED }}>Delivery: </span><span style={{ color: INK }}>{formatField(school.delivery)}</span></div>
        <div><span style={{ color: MUTED }}>Confidence: </span><span style={{ color: INK }}>{school.confidence.split(' ')[0]}</span></div>
      </div>
      <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${LINE}`, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', padding: '5px 12px', borderRadius: 999,
          background: 'rgba(255,138,102,.14)', color: '#FF8A66', fontSize: 12.5, fontWeight: 700,
        }}>
          Closest practice mode: {rec.label}
        </span>
      </div>
      <p style={{ color: MUTED, fontSize: 13, lineHeight: 1.6, marginTop: 10, marginBottom: 0 }}>{rec.note}</p>
      {school.distinctive && (
        <p style={{ color: MUTED, fontSize: 13, lineHeight: 1.6, marginTop: 10, marginBottom: 0, fontStyle: 'italic' }}>{school.distinctive}</p>
      )}
    </div>
  );
}

export function SchoolMatcher() {
  const schools = useMemo(() => listSchools(), []);
  const [query, setQuery] = useState('');
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return schools.filter((s) => s.university.toLowerCase().includes(q) || s.code.toLowerCase().includes(q)).slice(0, 6);
  }, [schools, query]);

  return (
    <div>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="e.g. Leeds, Manchester, Imperial, Queen's Belfast…"
        style={{
          width: '100%', boxSizing: 'border-box', background: CARD, border: `1px solid ${LINE}`,
          borderRadius: 14, padding: '14px 18px', color: INK, fontFamily: "'Inter Tight',system-ui,sans-serif",
          fontSize: 16, outline: 'none',
        }}
      />
      <p style={{ color: '#6C7589', fontSize: 12.5, marginTop: 8, marginBottom: 0 }}>
        {schools.length} UK course-routes indexed · "not published" means the school hasn't stated it publicly — never that the feature is absent.
      </p>
      {query.trim() && (
        <div style={{ display: 'grid', gap: 14, marginTop: 20 }}>
          {results.length === 0 ? (
            <p style={{ color: MUTED, fontSize: 15 }}>No match yet — try just the university name (e.g. "Leeds" rather than "University of Leeds A100").</p>
          ) : (
            results.map((s) => <SchoolCard key={s.id} school={s} />)
          )}
        </div>
      )}
    </div>
  );
}
