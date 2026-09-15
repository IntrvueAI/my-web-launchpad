import { useState } from 'react';
import { useMedicineDashboardStats, titleFor, MEDICINE_SKILL_COLUMNS } from '@/hooks/useMedicineDashboardStats';
import { Skeleton } from '@/components/ui/skeleton';

export function MedicineFeedback() {
  // Same react-query cache entry Home/Progress already populate — switching to this tab doesn't
  // re-fetch (see useMedicineDashboardStats.ts's `records` field).
  const { stats, loading } = useMedicineDashboardStats();
  const records = stats?.records ?? [];
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (loading) {
    return <div style={{ display: 'grid', gap: 16 }}><Skeleton className="h-10 w-64" /><Skeleton className="h-96 rounded-2xl" /></div>;
  }

  // Derived directly rather than synced via an effect — with data already warm in the react-query
  // cache (e.g. arriving here from Home/Progress), an effect-based default would leave the detail
  // pane empty for the first render before it runs.
  const effectiveSelectedId = selectedId ?? records[0]?.id ?? null;
  const selected = records.find((r) => r.id === effectiveSelectedId) ?? null;

  return (
    <div>
      <h1 style={{ fontFamily: "'Bricolage Grotesque',serif", fontWeight: 700, fontSize: 30, margin: '0 0 20px' }}>Feedback</h1>

      {records.length === 0 ? (
        <div style={cardStyle}>
          <p style={{ color: '#9A9488', fontSize: 15 }}>Once you've done a Medicine session, your written feedback will show up here.</p>
        </div>
      ) : (
        <div className="med-grid-feedback">
          <div style={{ ...cardStyle, padding: 10 }}>
            {records.map((r) => {
              const active = r.id === effectiveSelectedId;
              return (
                <button
                  key={r.id}
                  onClick={() => setSelectedId(r.id)}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left', padding: '15px 16px', borderRadius: 14, border: 0,
                    cursor: 'pointer', marginBottom: 4, fontFamily: 'inherit',
                    background: active ? '#FFF3EC' : 'transparent',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14.5, fontWeight: 600 }}>
                    <span>{titleFor(r)}</span>
                    <span style={{ color: active ? '#E8622F' : '#9A9488' }}>{r.total_score ?? '—'}/20</span>
                  </div>
                  <div style={{ color: '#9A9488', fontSize: 12.5, marginTop: 3 }}>
                    {new Date(r.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  </div>
                </button>
              );
            })}
          </div>

          {selected && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={cardStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <h2 style={{ fontFamily: "'Bricolage Grotesque',serif", fontWeight: 700, fontSize: 25, margin: 0 }}>{titleFor(selected)}</h2>
                    <div style={{ color: '#9A9488', fontSize: 13, marginTop: 6 }}>
                      {new Date(selected.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: "'Bricolage Grotesque',serif", fontWeight: 700, fontSize: 34, color: '#E8622F' }}>{selected.total_score ?? '—'} / 20</div>
                    <div style={{ color: '#9A9488', fontSize: 12.5 }}>Overall</div>
                  </div>
                </div>
                {selected.detailed_feedback?.overall && (
                  <p style={{ color: '#1C2029', fontSize: 15.5, lineHeight: 1.65, marginTop: 18, maxWidth: 760 }}>
                    {selected.detailed_feedback.overall}
                  </p>
                )}
              </div>

              <div style={cardStyle}>
                <h3 style={{ fontFamily: "'Bricolage Grotesque',serif", fontWeight: 700, fontSize: 17, margin: '0 0 16px' }}>By skill</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {MEDICINE_SKILL_COLUMNS.map((row) => {
                    const score = selected[row.key];
                    return (
                      <div key={row.label} style={{ display: 'grid', gridTemplateColumns: '210px 1fr 32px', alignItems: 'center', gap: 10, fontSize: 14 }}>
                        <span>{row.label}</span>
                        <div style={{ height: 6, background: '#F1EFEA', borderRadius: 4 }}>
                          <div style={{ height: 6, borderRadius: 4, width: `${((typeof score === 'number' ? score : 0) / 5) * 100}%`, background: 'linear-gradient(135deg,#FF7F50,#FF9F6B)' }} />
                        </div>
                        <span style={{ textAlign: 'right', color: '#6B7280' }}>{typeof score === 'number' ? score : '—'}</span>
                      </div>
                    );
                  })}
                </div>
                <p style={{ color: '#9A9488', fontSize: 12.5, marginTop: 14 }}>
                  Individual station scores aren't tracked separately yet — this circuit's overall score, broken down by skill.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: '#fff', border: '1px solid rgba(28,32,41,.09)', borderRadius: 20, padding: '26px 28px',
  boxShadow: '0 2px 10px -4px rgba(28,32,41,.08)',
};
