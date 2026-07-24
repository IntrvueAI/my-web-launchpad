import React, { useCallback, useEffect, useRef, useState } from 'react';
import Daily, { DailyCall } from '@daily-co/daily-js';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { InterviewType } from '@/config/interviewTypes';
import { Lightbulb, PhoneOff, CheckCircle2, XCircle, MinusCircle, Loader2 } from 'lucide-react';

interface TavusInterviewPlatformProps {
  selectedInterviewType: InterviewType;
}

type ViewState = 'idle' | 'connecting' | 'live' | 'ending' | 'ended' | 'error';

interface QuestionAttemptRow {
  id: string;
  question_id: string | null;
  question: string | null;
  outcome: string | null;
  student_answer: string | null;
  hints_used: number | null;
  created_at: string;
}

/**
 * Runs a "provider: tavus" interview (currently just maths-v2): creates a live Tavus/Daily
 * conversation via the tavus-create-conversation edge function, embeds it with daily-js, and on
 * end shows a summary pulled from question_attempts (written server-side by tavus-webhook as
 * Clara calls track_question_attempt during the call).
 *
 * Deliberately a separate component from InterviewPlatform rather than another branch inside it —
 * Tavus/Daily is a different SDK and transport from Anam's client.talk()/streamToVideoElement, so
 * sharing that 750-line, Anam-specific component would mean threading provider checks through
 * nearly every line of it for no real benefit.
 */
export const TavusInterviewPlatform: React.FC<TavusInterviewPlatformProps> = ({ selectedInterviewType }) => {
  const [view, setView] = useState<ViewState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState<QuestionAttemptRow[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const callRef = useRef<DailyCall | null>(null);
  const conversationIdRef = useRef<string | null>(null);
  const sessionReferenceRef = useRef<string | null>(null);
  // Guards against double-invocation: destroy() itself can trigger 'left-meeting', and without
  // this, that would re-run endInterview (double edge-function calls, duplicate summary fetch).
  const endingRef = useRef(false);
  const { toast } = useToast();

  const noteParagraphs = (selectedInterviewType.preStartNote ?? '')
    .split('\n\n')
    .map((p) => p.trim())
    .filter(Boolean);

  const cleanupCall = useCallback(() => {
    if (callRef.current) {
      try { callRef.current.destroy(); } catch { /* already gone */ }
      callRef.current = null;
    }
  }, []);

  useEffect(() => () => cleanupCall(), [cleanupCall]);

  const loadSummary = useCallback(async (sessionReference: string) => {
    const { data, error: fetchErr } = await supabase
      .from('question_attempts')
      .select('id, question_id, question, outcome, student_answer, hints_used, created_at')
      .eq('session_reference', sessionReference)
      .order('created_at', { ascending: true });
    if (fetchErr) {
      console.error('Failed to load question attempts:', fetchErr.message);
      return;
    }
    setAttempts((data ?? []) as QuestionAttemptRow[]);
  }, []);

  const endInterview = useCallback(async () => {
    if (endingRef.current) return;
    endingRef.current = true;
    setView('ending');
    cleanupCall();
    const conversationId = conversationIdRef.current;
    if (conversationId) {
      const { error: endErr } = await supabase.functions.invoke('tavus-end-conversation', {
        body: { conversation_id: conversationId },
      });
      if (endErr) console.error('tavus-end-conversation failed:', endErr.message);
    }
    if (sessionReferenceRef.current) {
      // Give the webhook a moment to land any final tool calls before we read the summary back.
      await new Promise((r) => setTimeout(r, 1500));
      await loadSummary(sessionReferenceRef.current);
    }
    setView('ended');
  }, [cleanupCall, loadSummary]);

  const startInterview = useCallback(async () => {
    setError(null);
    setView('connecting');
    endingRef.current = false;
    try {
      const { data, error: createErr } = await supabase.functions.invoke('tavus-create-conversation', {
        body: {},
      });
      if (createErr) throw new Error(createErr.message);
      if (!data?.conversation_url || !data?.conversation_id) throw new Error('No conversation returned');

      conversationIdRef.current = data.conversation_id;
      sessionReferenceRef.current = data.session_reference;

      if (!containerRef.current) throw new Error('Video container not ready');
      const call = Daily.createFrame(containerRef.current, {
        iframeStyle: { width: '100%', height: '100%', border: '0' },
        showLeaveButton: false,
        showFullscreenButton: true,
      });
      callRef.current = call;

      call.on('left-meeting', () => { endInterview(); });
      call.on('error', (ev) => {
        console.error('Daily call error:', ev);
        setError('The video call ran into a problem. Please try again.');
        setView('error');
        cleanupCall();
      });

      await call.join({ url: data.conversation_url });
      setView('live');
    } catch (err) {
      console.error('Failed to start Tavus interview:', err);
      setError(err instanceof Error ? err.message : 'Unable to start the interview. Please try again.');
      setView('error');
      cleanupCall();
      toast({
        title: 'Could not start interview',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'destructive',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cleanupCall, endInterview, toast]);

  if (view === 'idle' || view === 'connecting' || view === 'error') {
    return (
      <Card className="p-5 md:p-7 shadow-medium max-w-2xl mx-auto">
        {noteParagraphs.length > 0 && (
          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-center gap-2 mb-2 text-amber-800 font-semibold">
              <Lightbulb className="w-5 h-5" />
              A note before you start
            </div>
            <div className="space-y-2 text-sm text-amber-900/90">
              {noteParagraphs.map((p, i) => (
                <p key={i} className={i === noteParagraphs.length - 1 ? 'font-semibold' : ''}>{p}</p>
              ))}
            </div>
          </div>
        )}

        <h2 className="text-xl font-bold mb-1">{selectedInterviewType.name}</h2>
        <p className="text-sm text-muted-foreground mb-6">{selectedInterviewType.description}</p>

        {view === 'error' && error && (
          <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <Button onClick={startInterview} disabled={view === 'connecting'} size="lg" className="w-full">
          {view === 'connecting' ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Connecting…</>
          ) : (
            'Start Interview'
          )}
        </Button>
      </Card>
    );
  }

  if (view === 'live' || view === 'ending') {
    return (
      <div className="max-w-4xl mx-auto">
        <div ref={containerRef} className="w-full aspect-video rounded-lg overflow-hidden bg-black shadow-medium" />
        <div className="flex justify-center mt-4">
          <Button onClick={endInterview} disabled={view === 'ending'} variant="destructive" size="lg">
            {view === 'ending' ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Ending…</>
            ) : (
              <><PhoneOff className="w-4 h-4 mr-2" /> End Interview</>
            )}
          </Button>
        </div>
      </div>
    );
  }

  // view === 'ended'
  return (
    <Card className="p-5 md:p-7 shadow-medium max-w-2xl mx-auto">
      <h2 className="text-xl font-bold mb-1">Interview complete</h2>
      <p className="text-sm text-muted-foreground mb-6">Here's a quick summary of what you covered with Clara.</p>

      {attempts.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No questions were recorded for this session — it may have ended before Clara got through one.
        </p>
      ) : (
        <div className="space-y-3">
          {attempts.map((a, i) => {
            const isCorrect = a.outcome === 'correct_method' || a.outcome === 'correct_no_method';
            const isSkipped = a.outcome === 'skipped';
            const Icon = isSkipped ? MinusCircle : isCorrect ? CheckCircle2 : XCircle;
            const color = isSkipped ? 'text-muted-foreground' : isCorrect ? 'text-green-600' : 'text-destructive';
            return (
              <div key={a.id} className="flex gap-3 rounded-lg border p-3">
                <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${color}`} />
                <div className="min-w-0">
                  <p className="text-sm font-medium">Question {i + 1}{a.question_id ? ` · ${a.question_id}` : ''}</p>
                  {a.question && <p className="text-sm text-muted-foreground mt-0.5">{a.question}</p>}
                  {a.student_answer && (
                    <p className="text-xs text-muted-foreground mt-1">Your answer: {a.student_answer}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Button onClick={() => { setView('idle'); setAttempts([]); }} variant="outline" className="w-full mt-6">
        Done
      </Button>
    </Card>
  );
};
