import { MedicineDataError } from './MedicineDataError';
import { conciseFeedback } from '@/utils/feedbackSummary';
import { getInterviewTypeConfig } from '@/config/interviewTypes';
import type { InterviewType as InterviewTypeId } from '@/types/interview';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardStats, type UpcomingSchoolInterview } from '@/hooks/useDashboardStats';
import { useMedicineDashboardStats, type MedicineDashboardStats } from '@/hooks/useMedicineDashboardStats';
import { INTERVIEW_TYPES, InterviewType } from '@/config/interviewTypes';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp } from 'lucide-react';


interface Props {
  credits: number;
  onStartInterview: (type: InterviewType) => void;
  onOpenTab: (tab: 'practice' | 'progress' | 'feedback' | 'schools') => void;
  onOpenCredits: () => void;
  onOpenFeedback?: (id: string) => void;
}

const cardStyle: React.CSSProperties = {
  background: 'var(--med-card)', border: '1px solid var(--med-border)', borderRadius: 16, padding: '28px 30px',
  boxShadow: 'var(--med-shadow-sm)',
};

export function MedicineHome({ credits, onStartInterview, onOpenTab, onOpenCredits, onOpenFeedback }: Props) {
  const { user } = useAuth();
  const { stats: generalStats } = useDashboardStats();
  const { stats, loading, error, retry } = useMedicineDashboardStats();
  if (error) return <MedicineDataError onRetry={() => { void retry(); }} />;
  const firstName = (user?.user_metadata?.full_name as string | undefined)?.split(' ')[0] || 'there';
  return <MedicineHomeView credits={credits} onStartInterview={onStartInterview} onOpenTab={onOpenTab} onOpenCredits={onOpenCredits} onOpenFeedback={onOpenFeedback} stats={stats} loading={loading} firstName={firstName} nextRealInterview={generalStats?.upcomingSchoolInterviews?.[0]} />;
}

export function MedicineHomeView({ credits, onStartInterview, onOpenTab, onOpenCredits, onOpenFeedback, stats, loading=false, firstName='there', nextRealInterview }: Props & { stats?: MedicineDashboardStats; loading?: boolean; firstName?: string; nextRealInterview?: UpcomingSchoolInterview }) {

  const recommended = INTERVIEW_TYPES['medicine-ethics-practice'];
  const latest = stats?.records?.[0];
  const scoredSessions = stats?.scoredSessions ?? stats?.records.filter(record => typeof record.total_score === 'number').length ?? 0;
  const latestSummary = latest ? conciseFeedback(latest, getInterviewTypeConfig(latest.interview_type as InterviewTypeId).sections) : null;

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
    : "Start with a seven-minute mini interview and choose one thing to improve.";

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 }}>
          <h1 style={{ fontFamily: "var(--med-display)", fontWeight: 700, fontSize: 30, margin: 0, letterSpacing: '-.015em' }}>
            Good {timeOfDay()}, {firstName}
          </h1>
          <span style={{ color: 'var(--med-tertiary)', fontSize: 13.5 }}>{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
        </div>
        <p style={{ color: 'var(--med-muted)', fontSize: 15, marginTop: 6 }}>{subline}</p>
      </div>

      <div className="med-grid-home">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 260px', minWidth: 0 }}>
                <div style={{ color: 'var(--med-primary-dark)', fontSize: 11.5, fontWeight: 600, letterSpacing: '.14em', textTransform: 'uppercase' }}>Recommended next</div>
                <h2 style={{ fontFamily: "var(--med-display)", fontWeight: 700, fontSize: 25, margin: '10px 0 0' }}>{recommended.name.replace('Medicine MMI — ', '')}</h2>
                <p style={{ color: 'var(--med-muted)', fontSize: 15, lineHeight: 1.6, marginTop: 10, maxWidth: 460 }}>{recommended.description}</p>
                <div style={{ display: 'flex', gap: 12, marginTop: 22, flexWrap: 'wrap' }}>
                  <button onClick={() => onStartInterview(recommended)} style={primaryBtn}>
                    Start a 7-minute mini interview
                  </button>
                  <button onClick={() => onOpenTab('practice')} style={ghostBtn}>See all practice formats</button>
                </div>
              </div>
              <div style={{ width: 220, background: 'var(--med-bg)', borderRadius: 14, padding: 16, fontSize: 13 }}>
                <div style={{ color: 'var(--med-tertiary)', fontWeight: 600, fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 10 }}>Format</div>
                <Row label="Stations" value={'1'} />
                <Row label="Prep time" value={recommended.timingSeconds?.prep ? (recommended.timingSeconds.prep % 60 === 0 ? `${recommended.timingSeconds.prep / 60} minute${recommended.timingSeconds.prep === 60 ? '' : 's'}` : `${recommended.timingSeconds.prep} seconds`) : 'None'} />
                <Row label="Per station" value={recommended.timingSeconds ? `${recommended.timingSeconds.response / 60} min` : '—'} />
              </div>
            </div>
          </div>

          {latest && latestSummary && <section style={cardStyle} aria-label="Your last interview">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">Your last interview</p>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3"><h2 className="font-display text-xl font-semibold">{INTERVIEW_TYPES[latest.interview_type ?? '']?.name ?? 'Medicine practice'}</h2><strong className="text-2xl">{latest.total_score == null ? 'Partial assessment' : `${latest.total_score}/20`}</strong></div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2"><div><h3 className="text-sm font-semibold">Keep doing</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{latestSummary.strength}</p></div><div><h3 className="text-sm font-semibold">Try next</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{latestSummary.nextStep}</p></div></div>
            <button onClick={() => onOpenFeedback ? onOpenFeedback(latest.id) : onOpenTab('feedback')} className="mt-4 text-sm font-semibold underline underline-offset-4">Review this interview →</button>
          </section>}
          <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontFamily: "var(--med-display)", fontWeight: 700, fontSize: 17, margin: 0 }}>How you're scoring</h3>
              <button onClick={() => onOpenTab('progress')} style={linkStyle}>Open Progress →</button>
            </div>
            <div className="med-grid-scoring" style={{ marginTop: 18 }}>
              <div>
                <div style={{ fontFamily: "var(--med-display)", fontWeight: 700, fontSize: 44 }}>
                  {stats.averageScore ?? '—'}<span style={{ fontSize: 20, color: 'var(--med-tertiary)', fontWeight: 400 }}> / 20</span>
                </div>
                <div style={{ color: 'var(--med-tertiary)', fontSize: 13, marginTop: 2 }}>{scoredSessions ? `Average across ${scoredSessions} scored session${scoredSessions === 1 ? '' : 's'}` : 'No fully scored sessions yet'}</div>
                {stats.scoreDeltaLastMonth !== null && (
                  <div style={{ color: stats.scoreDeltaLastMonth >= 0 ? 'var(--med-success)' : 'var(--med-primary-dark)', fontSize: 13, fontWeight: 600, marginTop: 6 }}>
                    {stats.scoreDeltaLastMonth >= 0 ? '+' : ''}{stats.scoreDeltaLastMonth} in the last month
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {stats.skills.map((skill) => (
                  <div key={skill.label} style={{ display: 'grid', gridTemplateColumns: '160px 1fr 32px', alignItems: 'center', gap: 10, fontSize: 13 }}>
                    <span style={{ color: 'var(--med-ink)' }}>{skill.label}</span>
                    <div style={{ height: 6, background: 'var(--med-track)', borderRadius: 4 }}>
                      <div style={{ height: 6, borderRadius: 4, width: `${((skill.average ?? 0) / 5) * 100}%`, background: 'var(--med-action)' }} />
                    </div>
                    <span style={{ textAlign: 'right', color: 'var(--med-muted)' }}>{skill.average ?? '—'}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontFamily: "var(--med-display)", fontWeight: 700, fontSize: 17, margin: 0 }}>Recent sessions</h3>
              <button onClick={() => onOpenTab('feedback')} style={linkStyle}>All feedback →</button>
            </div>
            {stats.recentSessions.length === 0 ? (
              <p style={{ color: 'var(--med-tertiary)', fontSize: 14, marginTop: 16 }}>Once you've done a session, your feedback lands here.</p>
            ) : (
              <div style={{ marginTop: 12 }}>
                {stats.recentSessions.map((s, i) => (
                  <div key={s.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 py-4" style={{ borderTop: i > 0 ? '1px solid var(--med-border)' : undefined }}>
                    <div className="min-w-0"><p className="text-sm font-medium">{s.title}</p><p className="mt-1 text-xs text-muted-foreground">{new Date(s.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</p></div>
                    <div className="flex flex-col items-end gap-2">
                      {s.band !== null && <span className="rounded-lg bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">{s.band}/20</span>}
                      <button aria-label={`View feedback for ${s.title}`} onClick={() => onOpenFeedback ? onOpenFeedback(s.id) : onOpenTab('feedback')} style={linkStyle}>View feedback</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {nextRealInterview && (
            <div style={{ background: 'linear-gradient(180deg,var(--med-primary-tint),var(--med-primary-soft))', border: '1px solid var(--med-border)', borderRadius: 16, padding: '26px 28px' }}>
              <div style={{ color: 'var(--med-primary-dark)', fontSize: 11.5, fontWeight: 600, letterSpacing: '.14em', textTransform: 'uppercase' }}>Next real interview</div>
              <h3 style={{ fontFamily: "var(--med-display)", fontWeight: 700, fontSize: 21, margin: '10px 0 4px' }}>{nextRealInterview.school}</h3>
              <div style={{ color: 'var(--med-muted)', fontSize: 13.5 }}>{new Date(nextRealInterview.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long' })}</div>
              <div style={{ color: 'var(--med-primary-dark)', fontWeight: 700, fontSize: 15, marginTop: 10 }}>{nextRealInterview.daysUntil} day{nextRealInterview.daysUntil === 1 ? '' : 's'} away</div>
              <button onClick={() => onOpenTab('schools')} style={{ ...ghostBtn, width: '100%', marginTop: 16, minHeight: 44, background: 'var(--med-card)', border: '1px solid var(--med-border-strong)' }}>
                See its published format
              </button>
            </div>
          )}

          <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ color: 'var(--med-tertiary)', fontSize: 11.5, fontWeight: 600, letterSpacing: '.14em', textTransform: 'uppercase' }}>Credits</div>
              <button onClick={onOpenCredits} style={linkStyle}>Top up</button>
            </div>
            <div style={{ fontFamily: "var(--med-display)", fontWeight: 700, fontSize: 34, marginTop: 8 }}>{credits}</div>
            <p style={{ color: 'var(--med-tertiary)', fontSize: 13, marginTop: 6 }}>Medicine MMI circuits are free during early access.</p>
          </div>

          <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <div style={{ color: 'var(--med-tertiary)', fontSize: 11.5, fontWeight: 600, letterSpacing: '.14em', textTransform: 'uppercase' }}>Keeping it up</div>
              <span style={{ fontSize: 13.5, fontWeight: 600 }}>{stats.streak}-day streak</span>
            </div>
            <div style={{ display: 'flex', gap: 5, marginTop: 14 }}>
              {stats.weekStrip.map((done, i) => {
                const isToday = i === stats.weekStrip.length - 1;
                return (
                  <div key={i} style={{
                    flex: 1, height: 26, borderRadius: 6,
                    background: done ? (isToday ? 'var(--med-primary)' : 'var(--med-primary-soft)') : 'var(--med-track)',
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
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', color: 'var(--med-muted)' }}>
      <span>{label}</span>
      <span style={{ color: 'var(--med-ink)', fontWeight: 500 }}>{value}</span>
    </div>
  );
}

const primaryBtn: React.CSSProperties = {
  background: 'var(--med-action)', color: 'var(--med-card)', border: 0, borderRadius: 12,
  padding: '14px 22px', fontWeight: 600, fontSize: 15, cursor: 'pointer', minHeight: 48,
  boxShadow: '0 10px 26px -10px var(--med-primary-soft)',
};
const ghostBtn: React.CSSProperties = {
  background: 'var(--med-card)', color: 'var(--med-ink)', border: '1px solid var(--med-border-strong)', borderRadius: 12,
  padding: '14px 22px', fontWeight: 600, fontSize: 15, cursor: 'pointer', minHeight: 48,
};
const linkStyle: React.CSSProperties = {
  color: 'var(--med-primary-dark)', fontWeight: 600, fontSize: 13.5, background: 'none', border: 0, cursor: 'pointer', padding: 0,
};
