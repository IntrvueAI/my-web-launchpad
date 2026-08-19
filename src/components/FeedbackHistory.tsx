/**
 * FeedbackHistory Component
 * 
 * Displays a list of previous interview feedback records and allows users to
 * view detailed feedback for each session. This component now uses the modular
 * feedback system while maintaining backward compatibility.
 * 
 * Features:
 * - Historical feedback records with scores and metadata
 * - Session reference numbers for easy identification
 * - Detailed view using the enhanced InterviewFeedback component
 * - Support for different interview types and scoring systems
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FeedbackVersions } from './FeedbackVersions';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { SkillBreakdown } from '@/components/dashboard/SkillBreakdown';
import { SchoolTimeline } from '@/components/dashboard/SchoolTimeline';
import { INTENSITY_OPTIONS, type StudyIntensity } from '@/data/onboarding/studyPlan';
import { CalendarDays, ChevronRight, Trophy, Target, CheckCircle2 } from 'lucide-react';

import { FeedbackRecord } from '@/types/interview';
import { getBandLabel, getBandColor, shortInterviewLabel } from '@/utils/interviewHelpers';
import { FEEDBACK_DEFAULTS } from '@/constants/feedback';
import { FeedbackService } from '@/services/FeedbackService';
import { INTERVIEW_TYPES } from '@/config/interviewTypes';

// Interview types whose scores live in the four engine score columns (pattern_recognition_score …).
const ENGINE_SCORED = new Set(['logic-puzzles', 'maths-interview', 'verbal-interview', 'current-affairs-interview', '11-plus', 'medicine-mmi', 'chat-with-clara']);
const shortLabel = (s: string) => (s.length > 14 ? `${s.slice(0, 13)}…` : s);

export const FeedbackHistory: React.FC = () => {
  const [feedbackHistory, setFeedbackHistory] = useState<FeedbackRecord[]>([]);
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { stats } = useDashboardStats();

  const firstName =
    (user?.user_metadata?.full_name as string | undefined)?.split(' ')[0] ||
    user?.email?.split('@')[0] ||
    'there';
  const totalSessions = stats?.totalSessions ?? 0;
  const averageScore = stats?.averageScore ?? 0;
  const level = Math.floor(totalSessions / 5) + 1;
  const xpInLevel = (totalSessions % 5) * 40 + Math.round(averageScore * 5);
  const xpPct = Math.min(100, Math.round((xpInLevel / 300) * 100));

  // Training-plan pacing — the intensity chosen during onboarding (see OnboardingFlow.tsx),
  // stored on user_metadata since there's no profiles column for it. Days-active-this-week (not
  // raw session count) is what weekStrip gives us, so that's the pace proxy used here.
  const intensityId = user?.user_metadata?.study_intensity as StudyIntensity | undefined;
  const intensityOption = INTENSITY_OPTIONS.find((o) => o.id === intensityId) ?? null;
  const daysActiveThisWeek = stats?.weekStrip.filter((d) => d.completed).length ?? 0;
  const paceStatus = !intensityOption
    ? null
    : daysActiveThisWeek >= intensityOption.sessionsPerWeek
    ? 'on-target'
    : daysActiveThisWeek >= intensityOption.sessionsPerWeek - 1
    ? 'close'
    : 'behind';

  useEffect(() => {
    if (user) {
      fetchFeedbackHistory();
    }
  }, [user]);

  /**
   * Fetches the user's feedback history from the database
   */
  const fetchFeedbackHistory = async () => {
    if (!user) return;
    try {
      const records = await FeedbackService.getUserFeedbackHistory(user.id);
      const normalized = records.map((r) => ({
        ...r,
        annotations: Array.isArray(r.annotations) ? r.annotations : [],
      }));
      setFeedbackHistory(normalized);
    } catch (error) {
      console.error('Error fetching feedback history:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Legacy band label function - maintaining backward compatibility
   * TODO: Use getBandLabel from utils/interviewHelpers.ts
   */
  const getLegacyBandLabel = (score: number, interviewType?: string, scoringSystem?: string) => {
    if (interviewType === 'ielts') {
      if (score >= 8.5) return 'Expert User';
      if (score >= 7.5) return 'Very Good User';
      if (score >= 6.5) return 'Good User';
      if (score >= 5.5) return 'Competent User';
      if (score >= 4.5) return 'Modest User';
      return 'Limited User';
    }
    // 11+ labels
    if (score >= 18) return 'Outstanding';
    if (score >= 15) return 'Strong';
    if (score >= 12) return 'Good';
    if (score >= 8) return 'Developing';
    return 'Needs Support';
  };

  /**
   * Legacy band color function - maintaining backward compatibility
   * TODO: Use getBandColor from utils/interviewHelpers.ts
   */
  const getLegacyBandColor = (score: number, interviewType?: string, maxScore?: number) => {
    const max = interviewType === 'ielts' ? 9 : (maxScore || 20);
    const percentage = (score / max) * 100;
    if (percentage >= 90) return 'bg-emerald-500';
    if (percentage >= 75) return 'bg-green-500';
    if (percentage >= 60) return 'bg-blue-500';
    if (percentage >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  // Handle detailed feedback view
  if (selectedFeedback) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            onClick={() => setSelectedFeedback(null)}
          >
            ← Back to History
          </Button>
          <h2 className="text-xl font-semibold">
            Interview from {new Date(selectedFeedback.created_at).toLocaleDateString()}
            {selectedFeedback.session_reference && (
              <Badge variant="secondary" className="ml-2 text-xs font-mono">
                {selectedFeedback.session_reference}
              </Badge>
            )}
          </h2>
        </div>
        
        {/* Use the enhanced InterviewFeedback component — pass the FULL record so the detail view
            matches the live post-interview feedback exactly (section scores + Questions review). */}
        <FeedbackVersions
          feedback={{
            // 11+ scores
            personal_insight_score: selectedFeedback.personal_insight_score,
            reasoning_score: selectedFeedback.reasoning_score,
            extracurricular_score: selectedFeedback.extracurricular_score,
            current_awareness_score: selectedFeedback.current_awareness_score,
            // IELTS scores
            fluency_coherence_score: selectedFeedback.fluency_coherence_score,
            lexical_resource_score: selectedFeedback.lexical_resource_score,
            grammatical_range_score: selectedFeedback.grammatical_range_score,
            pronunciation_score: selectedFeedback.pronunciation_score,
            // Logic / Maths / Verbal / Current-affairs scores (engine-driven subjects)
            pattern_recognition_score: (selectedFeedback as any).pattern_recognition_score,
            logical_deduction_score: (selectedFeedback as any).logical_deduction_score,
            mathematical_logic_score: (selectedFeedback as any).mathematical_logic_score,
            clarity_of_thought_score: (selectedFeedback as any).clarity_of_thought_score,
            // Common fields
            total_score: selectedFeedback.total_score,
            detailed_feedback: selectedFeedback.detailed_feedback,
            // Annotated transcript
            transcription: selectedFeedback.transcription,
            annotations: selectedFeedback.annotations || [],
            // Overall improvement feedback
            overall_improvement_feedback: selectedFeedback.overall_improvement_feedback,
            // Per-question review (questions 1,2,3… + your response + mini review)
            questions_review: (selectedFeedback as any).questions_review || [],
          }}
          interviewType={selectedFeedback.interview_type || FEEDBACK_DEFAULTS.INTERVIEW_TYPE}
          scoringSystem={selectedFeedback.scoring_system || FEEDBACK_DEFAULTS.SCORING_SYSTEM}
        />
      </div>
    );
  }

  // Main feedback history list view
  return (
    <div data-tour="page-history" className="space-y-6">
      {/* Profile overview — same stat language as the Dashboard, so this reads as "your progress
          so far" rather than just a raw list. */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-rose flex items-center justify-center font-extrabold text-lg text-white select-none flex-none">
          {(user?.user_metadata?.full_name || user?.email || 'U').charAt(0).toUpperCase()}
        </div>
        <div>
          <h2 className="font-display text-[22px] font-semibold text-white">{firstName}&rsquo;s progress</h2>
          <p className="text-[13px] font-semibold text-muted-foreground">Your stats, skills, and school timeline in one place.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-[13px] md:grid-cols-4">
        <div className="rounded-[20px] p-[18px] text-white" style={{ background: 'linear-gradient(150deg,#8B5CF6,#6366F1)' }}>
          <div className="text-[11px] font-extrabold uppercase tracking-wide opacity-85">Level</div>
          <div className="font-display text-[28px] font-semibold leading-none my-1 flex items-center gap-2">{level}<Trophy className="h-4 w-4" /></div>
          <div className="h-2 rounded-full bg-white/25 overflow-hidden"><div className="h-full rounded-full bg-white" style={{ width: `${xpPct}%` }} /></div>
        </div>
        <div className="tile p-[18px]">
          <div className="text-[11px] font-extrabold uppercase tracking-wide text-[#7E8BA6]">Avg score</div>
          <div className="font-display text-[28px] font-semibold text-white leading-none my-1">{averageScore}<span className="text-[13px] text-muted-foreground font-bold"> /20</span></div>
        </div>
        <div className="tile p-[18px]">
          <div className="text-[11px] font-extrabold uppercase tracking-wide text-[#7E8BA6]">Streak</div>
          <div className="font-display text-[28px] font-semibold text-white leading-none my-1">{stats?.streak ?? 0}<span className="text-[13px] text-muted-foreground font-bold"> days</span></div>
        </div>
        <div className="tile p-[18px]">
          <div className="text-[11px] font-extrabold uppercase tracking-wide text-[#7E8BA6]">Interviews</div>
          <div className="font-display text-[28px] font-semibold text-white leading-none my-1">{totalSessions}</div>
        </div>
      </div>

      <SchoolTimeline dates={stats?.upcomingSchoolInterviews ?? []} />

      <div className="grid gap-[13px] lg:grid-cols-[1.3fr_1fr]">
        <SkillBreakdown stats={stats} />

        <div className="tile p-5 flex flex-col">
          <span className="font-display font-semibold text-[15px] text-white flex items-center gap-2 mb-3"><Target className="h-4 w-4 text-emerald" /> Training plan</span>
          {intensityOption ? (
            <div className="flex-1 flex flex-col justify-center gap-2.5">
              <div className="flex items-center gap-2">
                {paceStatus === 'on-target' && <CheckCircle2 className="h-4 w-4 text-emerald flex-none" />}
                <span className="text-[13.5px] font-semibold text-[#C7D2E4]">
                  {paceStatus === 'on-target' && "You're on target — "}
                  {paceStatus === 'close' && "Almost there — "}
                  {paceStatus === 'behind' && "Behind pace — "}
                  {daysActiveThisWeek} of {intensityOption.sessionsPerWeek} days practised this week ({intensityOption.label.toLowerCase()} plan).
                </span>
              </div>
              <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
                <div
                  className={`h-full rounded-full ${paceStatus === 'on-target' ? 'bg-emerald' : paceStatus === 'close' ? 'bg-amber' : 'bg-[#F87171]'}`}
                  style={{ width: `${Math.min(100, Math.round((daysActiveThisWeek / intensityOption.sessionsPerWeek) * 100))}%` }}
                />
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground flex-1 flex items-center">
              No training plan set yet — pick a pace next time you go through onboarding, or from Settings.
            </p>
          )}
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-2">Feedback History</h2>
        <p className="text-muted-foreground">
          Review your past interview performances and track your progress.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4 mx-auto"></div>
            <div className="h-4 bg-muted rounded w-1/2 mx-auto"></div>
          </div>
        </div>
      ) : feedbackHistory.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <CalendarDays className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No feedback yet</h3>
            <p className="text-muted-foreground">
              Complete an interview to see your feedback and track your progress.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {feedbackHistory.map((feedback) => (
            <Card key={feedback.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      Interview Session
                      <Badge variant="outline" className="text-xs">
                        {shortInterviewLabel(feedback.interview_type)}
                      </Badge>
                      {feedback.session_reference && (
                        <Badge variant="secondary" className="text-xs font-mono">
                          {feedback.session_reference}
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2">
                      <CalendarDays className="w-4 h-4" />
                      {new Date(feedback.created_at).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-2xl font-bold text-primary">
                        {feedback.interview_type === 'ielts' 
                          ? `${feedback.total_score}/9.0` 
                          : `${feedback.total_score}/20`
                        }
                      </div>
                      <Badge className={`${getLegacyBandColor(feedback.total_score, feedback.interview_type)} text-white text-xs`}>
                        {getLegacyBandLabel(feedback.total_score, feedback.interview_type, feedback.scoring_system)}
                      </Badge>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setSelectedFeedback(feedback)}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {feedback.interview_type === 'ielts' ? (
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div className="text-center">
                      <div className="font-semibold text-primary">{feedback.fluency_coherence_score || 0}/9</div>
                      <div className="text-muted-foreground">Fluency</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-primary">{feedback.lexical_resource_score || 0}/9</div>
                      <div className="text-muted-foreground">Vocabulary</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-primary">{feedback.grammatical_range_score || 0}/9</div>
                      <div className="text-muted-foreground">Grammar</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-primary">{feedback.pronunciation_score || 0}/9</div>
                      <div className="text-muted-foreground">Pronunciation</div>
                    </div>
                  </div>
                ) : ENGINE_SCORED.has(feedback.interview_type) ? (
                  (() => {
                    const labels = INTERVIEW_TYPES[feedback.interview_type]?.scoringCriteria || [];
                    const scores = [
                      (feedback as any).pattern_recognition_score,
                      (feedback as any).logical_deduction_score,
                      (feedback as any).mathematical_logic_score,
                      (feedback as any).clarity_of_thought_score,
                    ];
                    return (
                      <div className="grid grid-cols-4 gap-4 text-sm">
                        {scores.map((s, i) => (
                          <div className="text-center" key={i}>
                            <div className="font-semibold text-primary">{s || 0}/5</div>
                            <div className="text-muted-foreground">{shortLabel(labels[i] || `Section ${i + 1}`)}</div>
                          </div>
                        ))}
                      </div>
                    );
                  })()
                ) : (
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div className="text-center">
                      <div className="font-semibold text-primary">{feedback.personal_insight_score || 0}/5</div>
                      <div className="text-muted-foreground">Personal</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-primary">{feedback.reasoning_score || 0}/5</div>
                      <div className="text-muted-foreground">Reasoning</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-primary">{feedback.extracurricular_score || 0}/5</div>
                      <div className="text-muted-foreground">Activities</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-primary">{feedback.current_awareness_score || 0}/5</div>
                      <div className="text-muted-foreground">Awareness</div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};