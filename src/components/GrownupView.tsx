import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { FeedbackService } from '@/services/FeedbackService';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { shortInterviewLabel } from '@/utils/interviewHelpers';

interface FbRow {
  id: string; interview_type: string | null; total_score: number | null;
  created_at: string; transcription: string | null; scores: any;
}

const band = (s: number) =>
  s >= 15 ? { label: 'Strong', bg: '#059669', ring: 'hsl(var(--emerald))' }
  : s >= 10 ? { label: 'Good progress', bg: '#0284C7', ring: 'hsl(var(--sky))' }
  : s >= 5 ? { label: 'Getting there', bg: '#D97706', ring: 'hsl(var(--amber))' }
  : { label: 'Keep going', bg: '#DC2626', ring: '#F87171' };

export const GrownupView: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const { user } = useAuth();
  const { stats } = useDashboardStats();
  const [rows, setRows] = useState<FbRow[] | null>(null);
  const [transcript, setTranscript] = useState<{ title: string; when: string; text: string } | null>(null);

  const firstName =
    (user?.user_metadata?.full_name as string | undefined)?.split(' ')[0] || user?.email?.split('@')[0] || 'Your child';

  useEffect(() => {
    if (!user) return;
    FeedbackService.getUserFeedbackHistory(user.id, 9).then((data) => setRows(data as unknown as FbRow[])).catch(() => setRows([]));
  }, [user]);

  const avg = stats?.averageScore ?? 0;
  const trend = stats?.recentTrend ?? [];
  const delta = trend.length >= 2 ? Math.round((trend[trend.length - 1].score - trend[trend.length - 2].score) * 10) / 10 : null;
  const thisWeek = (stats?.weekStrip ?? []).filter((d) => d.completed).length;
  const next = (stats?.upcomingSchoolInterviews ?? [])[0];
  const readiness = Math.min(100, Math.round((avg / 20) * 70 + Math.min(30, (stats?.totalSessions ?? 0) * 3)));
  const rLabel = readiness >= 70 ? 'Interview ready' : readiness >= 40 ? 'Building' : 'Just starting';
  const rCirc = 2 * Math.PI * 29;

  return (
    <div className="mx-auto max-w-[1120px] px-4 sm:px-6 py-6">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-sky/10 border border-sky/20 px-3 py-[5px] text-[11px] font-extrabold text-sky">👋 Grown-up view</span>
          <h1 className="font-display text-[26px] font-semibold text-white mt-2">{firstName}&rsquo;s progress</h1>
          <p className="text-sm font-semibold text-muted-foreground mt-1.5 max-w-[560px] leading-relaxed">
            A calmer summary for parents — how practice is going, and the full transcript of every session.
          </p>
        </div>
        {onBack && (
          <button onClick={onBack} className="rounded-xl border border-white/15 bg-white/[0.03] px-4 py-2 text-[13px] font-extrabold text-[#C7D2E4] hover:bg-white/[0.06]">← Back to home</button>
        )}
      </div>

      {/* Stat tiles */}
      <div className="grid gap-[13px] md:grid-cols-[1.1fr_1fr_1fr_1fr] mb-5">
        <div className="tile p-[18px] flex items-center gap-3.5">
          <div className="relative w-[66px] h-[66px] flex-none">
            <svg width="66" height="66" viewBox="0 0 66 66">
              <circle cx="33" cy="33" r="29" fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="6" />
              <circle cx="33" cy="33" r="29" fill="none" stroke={band(avg).ring} strokeWidth="6" strokeLinecap="round" strokeDasharray={rCirc} strokeDashoffset={rCirc * (1 - readiness / 100)} transform="rotate(-90 33 33)" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center font-display text-base font-semibold text-white">{readiness}%</div>
          </div>
          <div>
            <div className="text-[11px] font-extrabold uppercase tracking-wide text-[#7E8BA6]">Readiness</div>
            <div className="text-sm font-extrabold text-[#FFB088] mt-0.5">{rLabel}</div>
            <div className="text-[11.5px] font-semibold text-muted-foreground mt-0.5">{next ? `${next.daysUntil} days to first interview` : 'No date set yet'}</div>
          </div>
        </div>
        <div className="tile p-[18px]">
          <div className="text-[11px] font-extrabold uppercase tracking-wide text-[#7E8BA6]">This week</div>
          <div className="font-display text-3xl font-semibold text-white mt-1.5">{thisWeek}</div>
          <div className="text-[11.5px] font-bold text-muted-foreground">practice {thisWeek === 1 ? 'session' : 'sessions'}</div>
        </div>
        <div className="tile p-[18px]">
          <div className="text-[11px] font-extrabold uppercase tracking-wide text-[#7E8BA6]">Next interview</div>
          {next ? (
            <>
              <div className="font-display text-xl font-semibold text-white mt-1.5">{next.school}</div>
              <div className="text-[11.5px] font-extrabold text-[#FFB088]">{new Date(`${next.date}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} · in {next.daysUntil} days</div>
            </>
          ) : <div className="text-sm text-muted-foreground mt-2">Add one in Settings</div>}
        </div>
        <div className="tile p-[18px]">
          <div className="text-[11px] font-extrabold uppercase tracking-wide text-[#7E8BA6]">Avg score</div>
          <div className="font-display text-3xl font-semibold text-white mt-1.5">{avg}<span className="text-sm text-[#7E8BA6]"> /20</span></div>
          {delta !== null && delta !== 0 && (
            <div className={cn('text-[11.5px] font-extrabold', delta > 0 ? 'text-emerald' : 'text-[#F87171]')}>{delta > 0 ? '↑' : '↓'} {Math.abs(delta)} since last session</div>
          )}
        </div>
      </div>

      {/* Recent interviews & transcripts */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display text-[17px] font-semibold text-white">Recent interviews &amp; transcripts</h2>
        <span className="text-xs font-bold text-muted-foreground hidden sm:block">Tap a card to read exactly what was said</span>
      </div>
      {rows === null ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-muted-foreground tile p-6 text-center">No interviews yet — they&rsquo;ll appear here after the first session.</p>
      ) : (
        <div className="grid gap-[13px] sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((r) => {
            const score = r.total_score ?? 0;
            const b = band(score);
            const when = new Date(r.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
            const skillEntries = r.scores && typeof r.scores === 'object' ? Object.entries(r.scores).slice(0, 4) : [];
            return (
              <div key={r.id} className="tile p-[18px] flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-extrabold text-[14px] text-[#EAF0FA] leading-tight">{shortInterviewLabel(r.interview_type)} Interview</div>
                    <div className="text-[11.5px] font-bold text-muted-foreground mt-0.5">{when}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="font-display text-2xl font-semibold" style={{ color: b.ring }}>{score}<span className="text-[13px] text-[#7E8BA6]">/20</span></div>
                  <span className="text-[10px] font-extrabold text-white px-2.5 py-[3px] rounded-full" style={{ background: b.bg }}>{b.label}</span>
                </div>
                {skillEntries.length > 0 && (
                  <div className="flex gap-1.5 flex-wrap">
                    {skillEntries.map(([k, v]) => (
                      <span key={k} className="text-[10px] font-extrabold text-[#AEB9D0] bg-white/5 px-2 py-[3px] rounded-lg">{k.split('_')[0]} {String(v)}</span>
                    ))}
                  </div>
                )}
                <button
                  onClick={() => setTranscript({ title: `${shortInterviewLabel(r.interview_type)} Interview`, when, text: r.transcription || 'No transcript was saved for this session.' })}
                  className="mt-auto text-left text-[12.5px] font-extrabold text-sky hover:underline"
                >
                  Review full transcript →
                </button>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={!!transcript} onOpenChange={(o) => !o && setTranscript(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="capitalize">{transcript?.title}</DialogTitle>
            <p className="text-xs text-muted-foreground">{transcript?.when}</p>
          </DialogHeader>
          <div className="overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed rounded-lg bg-white/[0.03] p-4">{transcript?.text}</div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
