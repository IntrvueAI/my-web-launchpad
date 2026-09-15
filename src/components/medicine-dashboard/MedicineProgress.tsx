import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis } from 'recharts';
import { useMedicineDashboardStats, type MedicineDashboardStats } from '@/hooks/useMedicineDashboardStats';
import { Skeleton } from '@/components/ui/skeleton';

export function MedicineProgress() {
  const { stats, loading } = useMedicineDashboardStats();
  return <MedicineProgressView stats={stats} loading={loading}/>;
}

export function MedicineProgressView({stats,loading=false}:{stats?:MedicineDashboardStats;loading?:boolean}) {

  if (loading || !stats) {
    return <div style={{ display: 'grid', gap: 16 }}><Skeleton className="h-10 w-64" /><Skeleton className="h-80 rounded-2xl" /></div>;
  }

  if (stats.totalSessions === 0) {
    return (
      <div>
        <h1 style={{ fontFamily: "var(--med-display)", fontWeight: 700, fontSize: 30, margin: '0 0 20px' }}>Progress</h1>
        <div style={cardStyle}>
          <p style={{ color: 'var(--med-tertiary)', fontSize: 15 }}>Your progress trend fills in once you've completed a few Medicine sessions.</p>
        </div>
      </div>
    );
  }

  const chartData = stats.recentTrend;
  const sortedByCount = [...stats.byStationType].sort((a, b) => b.count - a.count);
  const strongest = sortedByCount[0];
  const leastPractised = sortedByCount[sortedByCount.length - 1];

  const headline = stats.scoreDeltaLastMonth !== null && stats.scoreDeltaLastMonth > 0
    ? `You've moved up ${stats.scoreDeltaLastMonth} points in the last month.`
    : stats.totalSessions >= 3
      ? `${stats.totalSessions} sessions in — here's where things stand.`
      : 'A few more sessions will make this trend meaningful.';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={{ fontFamily: "var(--med-display)", fontWeight: 700, fontSize: 30, margin: 0 }}>Progress</h1>
        <p style={{ color: 'var(--med-muted)', fontSize: 15, marginTop: 6 }}>{headline}</p>
      </div>

      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <h3 style={{ fontFamily: "var(--med-display)", fontWeight: 700, fontSize: 17, margin: 0 }}>Score per session</h3>
          {stats.scoreDeltaLastMonth !== null && (
            <span style={{ color: stats.scoreDeltaLastMonth >= 0 ? 'var(--med-success)' : 'var(--med-primary-dark)', fontWeight: 600, fontSize: 13.5 }}>
              {stats.scoreDeltaLastMonth >= 0 ? '+' : ''}{stats.scoreDeltaLastMonth} overall
            </span>
          )}
        </div>
        <div style={{ height: 160, marginTop: 16 }}>
          <ResponsiveContainer>
            <AreaChart data={chartData} margin={{ top: 10, right: 12, bottom: 0, left: -20 }} accessibilityLayer>
              <CartesianGrid vertical={false} stroke="var(--med-border)" />
              <YAxis domain={[0,20]} ticks={[0,5,10,15,20]} tick={{fontSize:11,fill:'var(--med-tertiary)'}} axisLine={false} tickLine={false} />
              <XAxis dataKey="date" tickFormatter={(d) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} tick={{ fontSize: 11, fill: 'var(--med-tertiary)' }} />
              <RechartsTooltip
                contentStyle={{ fontSize: 12, background: 'var(--med-card)', border: '1px solid var(--med-border)', borderRadius: 8 }}
                labelFormatter={(d) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}
              />
              <Area type="linear" dataKey="score" name="Score / 20" stroke="var(--med-primary)" strokeWidth={2} fill="var(--med-primary-soft)" connectNulls={false} dot={{r:3,fill:'var(--med-primary)',stroke:'var(--med-card)',strokeWidth:2}} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="med-grid-two">
        {strongest && (
          <div style={cardStyle}>
            <div style={{ color: 'var(--med-tertiary)', fontSize: 11.5, fontWeight: 600, letterSpacing: '.14em', textTransform: 'uppercase' }}>Most practised</div>
            <h4 style={{ fontFamily: "var(--med-display)", fontWeight: 700, fontSize: 19, margin: '8px 0 4px' }}>{strongest.type}</h4>
            <p style={{ color: 'var(--med-muted)', fontSize: 14 }}>{strongest.count} session{strongest.count === 1 ? '' : 's'}, average score {strongest.averageScore ?? '—'}/20.</p>
          </div>
        )}
        {leastPractised && leastPractised !== strongest && (
          <div style={cardStyle}>
            <div style={{ color: 'var(--med-tertiary)', fontSize: 11.5, fontWeight: 600, letterSpacing: '.14em', textTransform: 'uppercase' }}>Least practised</div>
            <h4 style={{ fontFamily: "var(--med-display)", fontWeight: 700, fontSize: 19, margin: '8px 0 4px' }}>{leastPractised.type}</h4>
            <p style={{ color: 'var(--med-muted)', fontSize: 14 }}>Only {leastPractised.count} session{leastPractised.count === 1 ? '' : 's'} so far — worth a look.</p>
          </div>
        )}
      </div>

      <div style={cardStyle}>
        <h3 style={{ fontFamily: "var(--med-display)", fontWeight: 700, fontSize: 17, margin: '0 0 14px' }}>By skill</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {stats.skills.map((skill) => (
            <div key={skill.label} className="med-skill-row" style={{ display: 'grid', gridTemplateColumns: '220px 1fr 32px', alignItems: 'center', gap: 10, fontSize: 14 }}>
              <span>{skill.label}</span>
              <div style={{ height: 6, background: 'var(--med-track)', borderRadius: 4 }}>
                <div style={{ height: 6, borderRadius: 4, width: `${((skill.average ?? 0) / 5) * 100}%`, background: 'var(--med-action)' }} />
              </div>
              <span style={{ textAlign: 'right', color: 'var(--med-muted)' }}>{skill.average ?? '—'}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={cardStyle}>
        <div style={{ color: 'var(--med-tertiary)', fontSize: 11.5, fontWeight: 600, letterSpacing: '.14em', textTransform: 'uppercase', marginBottom: 12 }}>Milestones</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {getMilestoneChips(stats).map((chip) => (
            <span key={chip} style={{ border: '1px solid var(--med-border-strong)', borderRadius: 8, padding: '6px 12px', fontSize: 13, color: 'var(--med-ink)' }}>{chip}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

function getMilestoneChips(stats: ReturnType<typeof useMedicineDashboardStats>['stats']): string[] {
  if (!stats) return [];
  const chips: string[] = [];
  if (stats.streak >= 3) chips.push('On a Roll');
  if (stats.totalSessions >= 1) chips.push('First Circuit');
  if (stats.totalSessions >= 5) chips.push('Five Sessions In');
  if (stats.byStationType.length >= 2) chips.push('Tried Both Formats');
  if ((stats.averageScore ?? 0) >= 15) chips.push('Strong Scorer');
  return chips.length ? chips : ['Keep going — your first milestone is one session away'];
}

const cardStyle: React.CSSProperties = {
  background: 'var(--med-card)', border: '1px solid var(--med-border)', borderRadius: 16, padding: '26px 28px',
  boxShadow: 'var(--med-shadow-sm)',
};
