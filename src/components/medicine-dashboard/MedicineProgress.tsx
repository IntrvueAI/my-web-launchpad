import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis } from 'recharts';
import { useMedicineDashboardStats } from '@/hooks/useMedicineDashboardStats';
import { Skeleton } from '@/components/ui/skeleton';

const RAMP = ['#FFE4D6', '#FFD3BC', '#FFB894', '#FF9F6B', '#FF7F50'];

export function MedicineProgress() {
  const { stats, loading } = useMedicineDashboardStats();

  if (loading || !stats) {
    return <div style={{ display: 'grid', gap: 16 }}><Skeleton className="h-10 w-64" /><Skeleton className="h-80 rounded-2xl" /></div>;
  }

  if (stats.totalSessions === 0) {
    return (
      <div>
        <h1 style={{ fontFamily: "'Bricolage Grotesque',serif", fontWeight: 700, fontSize: 30, margin: '0 0 20px' }}>Progress</h1>
        <div style={cardStyle}>
          <p style={{ color: '#9A9488', fontSize: 15 }}>Your progress trend fills in once you've completed a few Medicine sessions.</p>
        </div>
      </div>
    );
  }

  const chartData = stats.recentTrend.map((t, i) => ({ ...t, fill: RAMP[Math.min(i, RAMP.length - 1)] }));
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
        <h1 style={{ fontFamily: "'Bricolage Grotesque',serif", fontWeight: 700, fontSize: 30, margin: 0 }}>Progress</h1>
        <p style={{ color: '#6B7280', fontSize: 15, marginTop: 6 }}>{headline}</p>
      </div>

      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <h3 style={{ fontFamily: "'Bricolage Grotesque',serif", fontWeight: 700, fontSize: 17, margin: 0 }}>Score per session</h3>
          {stats.scoreDeltaLastMonth !== null && (
            <span style={{ color: stats.scoreDeltaLastMonth >= 0 ? '#10B981' : '#E8622F', fontWeight: 600, fontSize: 13.5 }}>
              {stats.scoreDeltaLastMonth >= 0 ? '+' : ''}{stats.scoreDeltaLastMonth} overall
            </span>
          )}
        </div>
        <div style={{ height: 160, marginTop: 16 }}>
          <ResponsiveContainer>
            <BarChart data={chartData}>
              <XAxis dataKey="date" tickFormatter={(d) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} tick={{ fontSize: 11, fill: '#9A9488' }} />
              <RechartsTooltip
                contentStyle={{ fontSize: 12, background: '#fff', border: '1px solid rgba(28,32,41,.09)', borderRadius: 8 }}
                labelFormatter={(d) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}
              />
              <Bar dataKey="score" radius={[8, 8, 0, 0]}>
                {chartData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="med-grid-two">
        {strongest && (
          <div style={cardStyle}>
            <div style={{ color: '#9A9488', fontSize: 11.5, fontWeight: 600, letterSpacing: '.14em', textTransform: 'uppercase' }}>Most practised</div>
            <h4 style={{ fontFamily: "'Bricolage Grotesque',serif", fontWeight: 700, fontSize: 19, margin: '8px 0 4px' }}>{strongest.type}</h4>
            <p style={{ color: '#6B7280', fontSize: 14 }}>{strongest.count} session{strongest.count === 1 ? '' : 's'}, average score {strongest.averageScore ?? '—'}/20.</p>
          </div>
        )}
        {leastPractised && leastPractised !== strongest && (
          <div style={cardStyle}>
            <div style={{ color: '#9A9488', fontSize: 11.5, fontWeight: 600, letterSpacing: '.14em', textTransform: 'uppercase' }}>Least practised</div>
            <h4 style={{ fontFamily: "'Bricolage Grotesque',serif", fontWeight: 700, fontSize: 19, margin: '8px 0 4px' }}>{leastPractised.type}</h4>
            <p style={{ color: '#6B7280', fontSize: 14 }}>Only {leastPractised.count} session{leastPractised.count === 1 ? '' : 's'} so far — worth a look.</p>
          </div>
        )}
      </div>

      <div style={cardStyle}>
        <h3 style={{ fontFamily: "'Bricolage Grotesque',serif", fontWeight: 700, fontSize: 17, margin: '0 0 14px' }}>By skill</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {stats.skills.map((skill) => (
            <div key={skill.label} style={{ display: 'grid', gridTemplateColumns: '220px 1fr 32px', alignItems: 'center', gap: 10, fontSize: 14 }}>
              <span>{skill.label}</span>
              <div style={{ height: 6, background: '#F1EFEA', borderRadius: 4 }}>
                <div style={{ height: 6, borderRadius: 4, width: `${((skill.average ?? 0) / 5) * 100}%`, background: 'linear-gradient(135deg,#FF7F50,#FF9F6B)' }} />
              </div>
              <span style={{ textAlign: 'right', color: '#6B7280' }}>{skill.average ?? '—'}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={cardStyle}>
        <div style={{ color: '#9A9488', fontSize: 11.5, fontWeight: 600, letterSpacing: '.14em', textTransform: 'uppercase', marginBottom: 12 }}>Milestones</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {getMilestoneChips(stats).map((chip) => (
            <span key={chip} style={{ border: '1px solid rgba(28,32,41,.15)', borderRadius: 8, padding: '6px 12px', fontSize: 13, color: '#1C2029' }}>{chip}</span>
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
  background: '#fff', border: '1px solid rgba(28,32,41,.09)', borderRadius: 20, padding: '26px 28px',
  boxShadow: '0 2px 10px -4px rgba(28,32,41,.08)',
};
