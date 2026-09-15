import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useMedicineDashboardStats } from '@/hooks/useMedicineDashboardStats';
import { INTERVIEW_TYPES, InterviewType } from '@/config/interviewTypes';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp } from 'lucide-react';

const LEEDS = INTERVIEW_TYPES['medicine-mmi'];
const MANCHESTER = INTERVIEW_TYPES['medicine-mmi-manchester'];

interface Props {
  credits: number;
  onStartInterview: (type: InterviewType) => void;
  onOpenTab: (tab: 'practice' | 'progress' | 'feedback' | 'schools') => void;
  onOpenCredits: () => void;
}

const cardStyle: React.CSSProperties = {
  background: '#fff', border: '1px solid rgba(28,32,41,.09)', borderRadius: 20, padding: '28px 30px',
  boxShadow: '0 2px 10px -4px rgba(28,32,41,.08)',
};

export function MedicineHome({ credits, onStartInterview, onOpenTab, onOpenCredits }: Props) {
  const { user } = useAuth();
  const { stats: generalStats } = useDashboardStats();
  const { stats, loading } = useMedicineDashboardStats();
  const firstName = (user?.user_metadata?.full_name as string | undefined)?.split(' ')[0] || 'there';

  const recommended = useMemo(() => {
    if (!stats) return LEEDS;
    const leedsCount = stats.byStationType.find((s) => s.type === 'Leeds circuit')?.count ?? 0;
    const manchesterCount = stats.byStationType.find((s) => s.type === 'Manchester circuit')?.count ?? 0;
    return manchesterCount < leedsCount ? MANCHESTER : LEEDS;
  }, [stats]);

  const nextRealInterview = generalStats?.upcomingSchoolInterviews?.[0];

  if (loading || !stats) {
    return (
      <div style={{ display: 'grid', gap: 20 }}>
        <Skeleton className="h-8 w-72" />
        <div className="med-grid-home">
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </div>
    );
  }

  const subline = stats.totalSessions > 0
    ? `You've done ${stats.totalSessions} Medicine ${stats.totalSessions === 1 ? 'session' : 'sessions'} so far.${nextRealInterview ? ` ${nextRealInterview.school} is ${nextRealInterview.daysUntil} day${nextRealInterview.daysUntil === 1 ? '' : 's'} away.` : ''}`
    : "You haven't started a Medicine MMI practice session yet — the recommended circuit below is a good first one.";

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 }}>
          <h1 style={{ fontFamily: "'Bricolage Grotesque',serif", fontWeight: 700, fontSize: 30, margin: 0, letterSpacing: '-.015em' }}>
            Good {timeOfDay()}, {firstName}
          </h1>
          <span style={{ color: '#9A9488', fontSize: 13.5 }}>{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
        </div>
        <p style={{ color: '#6B7280', fontSize: 15, marginTop: 6 }}>{subline}</p>
      </div>

      <div className="med-grid-home">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 260 }}>
                <div style={{ color: '#E8622F', fontSize: 11.5, fontWeight: 600, letterSpacing: '.14em', textTransform: 'uppercase' }}>Recommended next</div>
                <h2 style={{ fontFamily: "'Bricolage Grotesque',serif", fontWeight: 700, fontSize: 25, margin: '10px 0 0' }}>{recommended.name.replace('Medicine MMI — ', '')}</h2>
                <p style={{ color: '#6B7280', fontSize: 15, lineHeight: 1.6, marginTop: 10, maxWidth: 460 }}>{recommended.description}</p>
                <div style={{ display: 'flex', gap: 12, marginTop: 22, flexWrap: 'wrap' }}>
                  <button onClick={() => onStartInterview(recommended)} style={primaryBtn}>
                    Start circuit · {recommended.costCredits ?? 0} credits
                  </button>
                  <button onClick={() => onOpenTab('practice')} style={ghostBtn}>Choose a different format</button>
                </div>
              </div>
              <div style={{ width: 220, background: '#FAFAF8', borderRadius: 14, padding: 16, fontSize: 13 }}>
                <div style={{ color: '#9A9488', fontWeight: 600, fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 10 }}>Format</div>
                <Row label="Stations" value={String(recommended.timingSeconds ? (recommended === LEEDS ? 8 : 5) : '—')} />
                <Row label="Prep time" value={recommended.timingSeconds?.prep ? `${recommended.timingSeconds.prep / 60} min` : 'None'} />
                <Row label="Per station" value={recommended.timingSeconds ? `${recommended.timingSeconds.response / 60} min` : '—'} />
              </div>
            </div>
          </div>

          <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontFamily: "'Bricolage Grotesque',serif", fontWeight: 700, fontSize: 17, margin: 0 }}>How you're scoring</h3>
              <button onClick={() => onOpenTab('progress')} style={linkStyle}>Open Progress →</button>
            </div>
            <div className="med-grid-scoring" style={{ marginTop: 18 }}>
              <div>
                <div style={{ fontFamily: "'Bricolage Grotesque',serif", fontWeight: 700, fontSize: 44 }}>
                  {stats.averageScore ?? '—'}<span style={{ fontSize: 20, color: '#9A9488', fontWeight: 400 }}> / 20</span>
                </div>
                <div style={{ color: '#9A9488', fontSize: 13, marginTop: 2 }}>Average across {stats.totalSessions} session{stats.totalSessions === 1 ? '' : 's'}</div>
                {stats.scoreDeltaLastMonth !== null && (
                  <div style={{ color: stats.scoreDeltaLastMonth >= 0 ? '#10B981' : '#E8622F', fontSize: 13, fontWeight: 600, marginTop: 6 }}>
                    {stats.scoreDeltaLastMonth >= 0 ? '+' : ''}{stats.scoreDeltaLastMonth} in the last month
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {stats.skills.map((skill) => (
                  <div key={skill.label} style={{ display: 'grid', gridTemplateColumns: '160px 1fr 32px', alignItems: 'center', gap: 10, fontSize: 13 }}>
                    <span style={{ color: '#1C2029' }}>{skill.label}</span>
                    <div style={{ height: 6, background: '#F1EFEA', borderRadius: 4 }}>
                      <div style={{ height: 6, borderRadius: 4, width: `${((skill.average ?? 0) / 5) * 100}%`, background: 'linear-gradient(135deg,#FF7F50,#FF9F6B)' }} />
                    </div>
                    <span style={{ textAlign: 'right', color: '#6B7280' }}>{skill.average ?? '—'}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontFamily: "'Bricolage Grotesque',serif", fontWeight: 700, fontSize: 17, margin: 0 }}>Recent sessions</h3>
              <button onClick={() => onOpenTab('feedback')} style={linkStyle}>All feedback →</button>
            </div>
            {stats.recentSessions.length === 0 ? (
              <p style={{ color: '#9A9488', fontSize: 14, marginTop: 16 }}>Once you've done a session, your feedback lands here.</p>
            ) : (
              <div style={{ marginTop: 12 }}>
                {stats.recentSessions.map((s, i) => (
                  <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 0', borderTop: i > 0 ? '1px solid rgba(28,32,41,.09)' : undefined }}>
                    <span style={{ color: '#9A9488', fontSize: 13, width: 86 }}>{new Date(s.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                    <span style={{ flex: 1, fontSize: 14.5 }}>{s.title}</span>
                    {s.band !== null && <span style={{ background: '#FFE4D6', color: '#E8622F', fontSize: 12.5, fontWeight: 600, padding: '4px 10px', borderRadius: 8 }}>Score {s.band}/20</span>}
                    <button onClick={() => onOpenTab('feedback')} style={linkStyle}>View feedback</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {nextRealInterview && (
            <div style={{ background: 'linear-gradient(180deg,#FFF3EC,#FFE9DD)', border: '1px solid rgba(232,98,47,.18)', borderRadius: 20, padding: '26px 28px' }}>
              <div style={{ color: '#E8622F', fontSize: 11.5, fontWeight: 600, letterSpacing: '.14em', textTransform: 'uppercase' }}>Next real interview</div>
              <h3 style={{ fontFamily: "'Bricolage Grotesque',serif", fontWeight: 700, fontSize: 21, margin: '10px 0 4px' }}>{nextRealInterview.school}</h3>
              <div style={{ color: '#6B7280', fontSize: 13.5 }}>{new Date(nextRealInterview.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long' })}</div>
              <div style={{ color: '#E8622F', fontWeight: 700, fontSize: 15, marginTop: 10 }}>{nextRealInterview.daysUntil} day{nextRealInterview.daysUntil === 1 ? '' : 's'} away</div>
              <button onClick={() => onOpenTab('schools')} style={{ ...ghostBtn, width: '100%', marginTop: 16, minHeight: 44, background: '#fff', border: '1px solid rgba(232,98,47,.28)' }}>
                See its published format
              </button>
            </div>
          )}

          <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ color: '#9A9488', fontSize: 11.5, fontWeight: 600, letterSpacing: '.14em', textTransform: 'uppercase' }}>Credits</div>
              <button onClick={onOpenCredits} style={linkStyle}>Top up</button>
            </div>
            <div style={{ fontFamily: "'Bricolage Grotesque',serif", fontWeight: 700, fontSize: 34, marginTop: 8 }}>{credits}</div>
            <p style={{ color: '#9A9488', fontSize: 13, marginTop: 6 }}>Medicine MMI circuits are free during early access.</p>
          </div>

          <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <div style={{ color: '#9A9488', fontSize: 11.5, fontWeight: 600, letterSpacing: '.14em', textTransform: 'uppercase' }}>Keeping it up</div>
              <span style={{ fontSize: 13.5, fontWeight: 600 }}>{stats.streak}-day streak</span>
            </div>
            <div style={{ display: 'flex', gap: 5, marginTop: 14 }}>
              {stats.weekStrip.map((done, i) => {
                const isToday = i === stats.weekStrip.length - 1;
                return (
                  <div key={i} style={{
                    flex: 1, height: 26, borderRadius: 6,
                    background: done ? (isToday ? '#FF7F50' : '#FFE4D6') : '#F1EFEA',
                  }} />
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function timeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 18) return 'afternoon';
  return 'evening';
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', color: '#6B7280' }}>
      <span>{label}</span>
      <span style={{ color: '#1C2029', fontWeight: 500 }}>{value}</span>
    </div>
  );
}

const primaryBtn: React.CSSProperties = {
  background: 'linear-gradient(135deg,#FF7F50 0%,#FF9F6B 100%)', color: '#fff', border: 0, borderRadius: 12,
  padding: '14px 22px', fontWeight: 600, fontSize: 15, cursor: 'pointer', minHeight: 48,
  boxShadow: '0 10px 26px -10px rgba(232,98,47,.55)',
};
const ghostBtn: React.CSSProperties = {
  background: '#fff', color: '#1C2029', border: '1px solid rgba(28,32,41,.15)', borderRadius: 12,
  padding: '14px 22px', fontWeight: 600, fontSize: 15, cursor: 'pointer', minHeight: 48,
};
const linkStyle: React.CSSProperties = {
  color: '#E8622F', fontWeight: 600, fontSize: 13.5, background: 'none', border: 0, cursor: 'pointer', padding: 0,
};
