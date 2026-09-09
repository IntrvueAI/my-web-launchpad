import { useMemo, useState } from 'react';
import { listSchools, type SchoolRoute } from '@/interview/medicine-content';

/**
 * The one genuinely interactive piece of the /medicine marketing page — real data (68 UK
 * course-routes, each checked against the institution's own admissions page), searched client-side.
 * Styled to match the host static page's bespoke palette directly (hex values, not the app's
 * Tailwind tokens) since it's portaled into the middle of that page, not the app shell. `theme`
 * picks which host palette to match — defaults to the live dark/coral medicine.html page.
 */
const THEMES = {
  dark: {
    ink: '#F3F6FB', muted: '#A6AFC1', subtle: '#6C7589', card: '#151C2E', line: 'rgba(255,255,255,.09)',
    chipBg: 'rgba(255,138,102,.14)', chipColor: '#FF8A66',
  },
  light: {
    ink: '#1C2029', muted: '#6B7280', subtle: '#9A9488', card: '#FFFFFF', line: 'rgba(28,32,41,.12)',
    chipBg: '#FFE4D6', chipColor: '#E8622F',
  },
} as const;
type PaletteTheme = (typeof THEMES)[keyof typeof THEMES];

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

function SchoolCard({ school, t }: { school: SchoolRoute; t: PaletteTheme }) {
  const rec = recommendMode(school);
  return (
    <div style={{ background: t.card, border: `1px solid ${t.line}`, borderRadius: 20, padding: 24, textAlign: 'left' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontFamily: "'Bricolage Grotesque',serif", fontWeight: 700, fontSize: 18, color: t.ink }}>{school.university}</div>
          <div style={{ fontSize: 13, color: t.muted, marginTop: 2 }}>{school.code} · {school.route}</div>
        </div>
        <a href={school.source_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, whiteSpace: 'nowrap' }}>source ↗</a>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginTop: 16, fontSize: 13.5 }}>
        <div><span style={{ color: t.muted }}>Stations: </span><span style={{ color: t.ink }}>{formatField(school.stations)}</span></div>
        <div><span style={{ color: t.muted }}>Station length: </span><span style={{ color: t.ink }}>{school.station_length_min ? `${school.station_length_min} min` : 'not published'}</span></div>
        <div><span style={{ color: t.muted }}>Reading time: </span><span style={{ color: t.ink }}>{school.prep_time_min === null ? 'not published' : school.prep_time_min === 0 ? 'none' : `${school.prep_time_min} min`}</span></div>
        <div><span style={{ color: t.muted }}>Roleplay: </span><span style={{ color: t.ink }}>{formatField(school.roleplay)}</span></div>
        <div><span style={{ color: t.muted }}>Delivery: </span><span style={{ color: t.ink }}>{formatField(school.delivery)}</span></div>
        <div><span style={{ color: t.muted }}>Confidence: </span><span style={{ color: t.ink }}>{school.confidence.split(' ')[0]}</span></div>
      </div>
      <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${t.line}`, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', padding: '5px 12px', borderRadius: 999,
          background: t.chipBg, color: t.chipColor, fontSize: 12.5, fontWeight: 700,
        }}>
          Closest practice mode: {rec.label}
        </span>
      </div>
      <p style={{ color: t.muted, fontSize: 13, lineHeight: 1.6, marginTop: 10, marginBottom: 0 }}>{rec.note}</p>
      {school.distinctive && (
        <p style={{ color: t.muted, fontSize: 13, lineHeight: 1.6, marginTop: 10, marginBottom: 0, fontStyle: 'italic' }}>{school.distinctive}</p>
      )}
    </div>
  );
}

export function SchoolMatcher({ theme = 'dark' }: { theme?: keyof typeof THEMES }) {
  const t = THEMES[theme];
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
          width: '100%', boxSizing: 'border-box', background: t.card, border: `1px solid ${t.line}`,
          borderRadius: 14, padding: '14px 18px', color: t.ink, fontFamily: "'Inter Tight',system-ui,sans-serif",
          fontSize: 16, outline: 'none',
        }}
      />
      <p style={{ color: t.subtle, fontSize: 12.5, marginTop: 8, marginBottom: 0 }}>
        {schools.length} UK course-routes indexed · "not published" means the school hasn't stated it publicly — never that the feature is absent.
      </p>
      {query.trim() && (
        <div style={{ display: 'grid', gap: 14, marginTop: 20 }}>
          {results.length === 0 ? (
            <p style={{ color: t.muted, fontSize: 15 }}>No match yet — try just the university name (e.g. "Leeds" rather than "University of Leeds A100").</p>
          ) : (
            results.map((s) => <SchoolCard key={s.id} school={s} t={t} />)
          )}
        </div>
      )}
    </div>
  );
}
