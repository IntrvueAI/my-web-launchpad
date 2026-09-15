import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { FeedbackService } from '@/services/FeedbackService';
import { FeedbackRecord } from '@/types/interview';
import { Skeleton } from '@/components/ui/skeleton';

const MEDICINE_TYPES = ['medicine-mmi', 'medicine-mmi-manchester'];

// Real per-skill breakdown (see useMedicineDashboardStats.ts for why these column names don't
// match their real meaning) — used as the "station by station" fallback since individual MMI
// stations aren't persisted as separate scored rows yet, only the whole circuit's total.
const SKILL_ROWS: { key: keyof FeedbackRecord; label: string }[] = [
  { key: 'pattern_recognition_score', label: 'Content & Reasoning' },
  { key: 'logical_deduction_score', label: 'Communication & Delivery' },
  { key: 'mathematical_logic_score', label: 'Empathy & Professional Judgement' },
  { key: 'clarity_of_thought_score', label: 'Insight & Reflection' },
];

const titleFor = (r: FeedbackRecord) => r.interview_type === 'medicine-mmi-manchester' ? 'Manchester circuit' : 'Leeds circuit';

export function MedicineFeedback() {
  const { user } = useAuth();
  const [records, setRecords] = useState<FeedbackRecord[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    FeedbackService.getUserFeedbackHistory(user.id, 200).then((all) => {
      const medicine = all.filter((r) => MEDICINE_TYPES.includes(r.interview_type ?? ''));
      setRecords(medicine);
      setSelectedId(medicine[0]?.id ?? null);
    });
  }, [user]);

  if (records === null) {
    return <div style={{ display: 'grid', gap: 16 }}><Skeleton className="h-10 w-64" /><Skeleton className="h-96 rounded-2xl" /></div>;
  }

  const selected = records.find((r) => r.id === selectedId) ?? null;

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
              const active = r.id === selectedId;
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
                  {SKILL_ROWS.map((row) => {
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
