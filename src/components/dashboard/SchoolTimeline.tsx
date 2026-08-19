import { Calendar } from 'lucide-react';
import type { UpcomingSchoolInterview } from '@/hooks/useDashboardStats';

const DATE_ACCENTS = ['#FF9E77', '#DCE4F2', '#DCE4F2'];

const fmtDate = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString('en-GB', { month: 'short', day: '2-digit' });

/** Shared between Dashboard and the Feedback page's profile overview — the "N days until
 *  [school]" chip row, sourced from profiles.school_interviews. */
export function SchoolTimeline({ dates }: { dates: UpcomingSchoolInterview[] }) {
  if (dates.length === 0) return null;

  return (
    <div className="tile px-5 py-4 flex items-center gap-4 flex-wrap">
      <div className="font-display font-semibold text-[15px] text-white flex items-center gap-2 flex-none">
        <Calendar className="h-[17px] w-[17px] text-[#F0A579]" /> Interview dates
      </div>
      <div className="flex gap-2.5 flex-1 flex-wrap">
        {dates.slice(0, 3).map((d, i) => (
          <div key={`${d.school}-${d.date}`} className="flex items-center gap-2.5 rounded-xl px-3.5 py-2 border" style={{ background: i === 0 ? 'rgba(255,127,80,.12)' : 'rgba(255,255,255,.04)', borderColor: i === 0 ? 'rgba(255,127,80,.3)' : 'rgba(255,255,255,.08)' }}>
            <div className="font-display text-xl font-semibold" style={{ color: DATE_ACCENTS[i] }}>{fmtDate(d.date)}</div>
            <div className="text-[11.5px] font-extrabold text-[#EAF0FA] leading-tight">
              {d.school}<br /><span className="text-muted-foreground font-bold">{d.daysUntil === 0 ? 'Today' : d.daysUntil === 1 ? '1 day' : `${d.daysUntil} days`}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
