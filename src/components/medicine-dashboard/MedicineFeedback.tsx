import { FeedbackSummary } from '@/components/feedback/FeedbackSummary';
import { useState } from 'react';
import { useMedicineDashboardStats, titleFor, type MedicineDashboardStats } from '@/hooks/useMedicineDashboardStats';
import { Skeleton } from '@/components/ui/skeleton';

export function MedicineFeedback({selectedFeedbackId}: {selectedFeedbackId?: string}) {
  // Same react-query cache entry Home/Progress already populate — switching to this tab doesn't
  // re-fetch (see useMedicineDashboardStats.ts's `records` field).
  const { stats, loading } = useMedicineDashboardStats();
  return <MedicineFeedbackView stats={stats} loading={loading} selectedFeedbackId={selectedFeedbackId}/>;
}

export function MedicineFeedbackView({stats,loading=false,selectedFeedbackId}:{stats?:MedicineDashboardStats;loading?:boolean;selectedFeedbackId?:string}) {
  const records = stats?.records ?? [];
  const [selectedId, setSelectedId] = useState<string | null>(selectedFeedbackId ?? null);

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
      <h1 style={{ fontFamily: "var(--med-display)", fontWeight: 700, fontSize: 30, margin: '0 0 20px' }}>Feedback</h1>

      {records.length === 0 ? (
        <div style={cardStyle}>
          <p style={{ color: 'var(--med-tertiary)', fontSize: 15 }}>Once you've done a Medicine session, your written feedback will show up here.</p>
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
                    background: active ? 'var(--med-primary-tint)' : 'transparent',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14.5, fontWeight: 600 }}>
                    <span>{titleFor(r)}</span>
                    <span style={{ color: active ? 'var(--med-primary-dark)' : 'var(--med-tertiary)' }}>{r.total_score == null ? 'Partial assessment' : `${r.total_score}/20`}</span>
                  </div>
                  <div style={{ color: 'var(--med-tertiary)', fontSize: 12.5, marginTop: 3 }}>
                    {new Date(r.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  </div>
                </button>
              );
            })}
          </div>

          {selected && <FeedbackSummary key={selected.id} feedback={selected} interviewType={selected.interview_type ?? 'medicine-mmi'}/>}

        </div>
      )}
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: 'var(--med-card)', border: '1px solid var(--med-border)', borderRadius: 16, padding: '26px 28px',
  boxShadow: 'var(--med-shadow-sm)',
};
