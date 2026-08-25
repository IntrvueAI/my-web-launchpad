import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { InterviewControls } from './InterviewControls';
import { InterviewStatus } from './InterviewStatus';
import { FeedbackVersions } from './FeedbackVersions';
import { ChatHistory } from './ChatHistory';
import { useInterviewSessionV2 } from '@/hooks/useInterviewSessionV2';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Play, Square, Mic, MicOff, RotateCcw, Eye, EyeOff, Keyboard, Send } from 'lucide-react';
import { InterviewTimer } from './InterviewTimer';
import { InterviewType, getDefaultInterviewType } from '@/config/interviewTypes';
import { InterviewSetup, SetupChoice } from './InterviewSetup';
import { ShareFeedbackBox } from './ShareFeedbackBox';
import { getSubjectPack } from '@/interview/subjects';

interface InterviewPlatformProps {
  selectedInterviewType?: InterviewType | null;
}

type BrainUiState = ReturnType<typeof useInterviewSessionV2>['brainUiState'];

/**
 * 11-plus-v2 only: same UI as InterviewPlatform, driven by useInterviewSessionV2 (Deepgram STT
 * instead of Anam's own listening) instead of useInterviewSession. Deliberately a separate
 * component/file rather than a branch inside InterviewPlatform — that component is proven, live,
 * and load-bearing for every other interview type; duplicating it here means this experiment can
 * never regress it, at the cost of the two files drifting if one gets UI tweaks and not the other.
 */
function progressLabel(ui: NonNullable<BrainUiState>): string {
  const total = ui.targetQuestions ?? 10;
  const idx = ui.questionIndex ?? 0;
  if (ui.phase === 'about-you') {
    const about = Math.max(1, ui.aboutYouCount ?? 0);
    return `Getting to know you · ${Math.min(idx + 1, about)} of ${about}`;
  }
  if (ui.phase === 'challenge') {
    const about = ui.aboutYouCount ?? 0;
    const local = Math.min(idx - about + 1, total - about);
    return `The challenge · ${Math.max(1, local)} of ${Math.max(1, total - about)}`;
  }
  if (!ui.onQuestion && idx === 0) return 'Warming up';
  return `Question ${Math.min(idx + 1, total)} of ${total}`;
}

function phaseDots(ui: NonNullable<BrainUiState>): { count: number; idx: number } {
  const total = ui.targetQuestions ?? 10;
  const idx = ui.questionIndex ?? 0;
  const about = ui.aboutYouCount ?? 0;
  if (ui.phase === 'about-you') return { count: Math.max(1, about), idx };
  if (ui.phase === 'challenge') return { count: Math.max(1, total - about), idx: Math.max(0, idx - about) };
  return { count: total, idx };
}

export const InterviewPlatformV2: React.FC<InterviewPlatformProps> = ({
  selectedInterviewType
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const [hideTranscript, setHideTranscript] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [pushToTalk, setPushToTalk] = useState(() => {
    try { return localStorage.getItem('intrvue-ptt') === '1'; } catch { return false; }
  });
  const [pttHeld, setPttHeld] = useState(false);
  const pttMuteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [typeMode, setTypeMode] = useState(false);
  const [typedText, setTypedText] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [isGeneratingFeedback, setIsGeneratingFeedback] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const [highlightEnd, setHighlightEnd] = useState(false);
  const [attentionNudged, setAttentionNudged] = useState(false);
  const [endHintText, setEndHintText] = useState<string>('');
  const controlsContainerRef = useRef<HTMLDivElement>(null);

  const interviewType = selectedInterviewType || getDefaultInterviewType();
  const engineDriven = Boolean(interviewType.engineDriven);

  const [setupChoice, setSetupChoice] = useState<SetupChoice | null>(null);
  const subjectPack = engineDriven ? getSubjectPack(interviewType.engineSubject || '') : undefined;

  const {
    isConnected,
    isStreaming,
    error,
    chatHistory,
    liveCaption,
    sessionReference,
    connectionHealth,
    startInterview,
    stopInterview,
    sessionStatus,
    setMicMuted,
    setPushToTalkMode,
    flushPushToTalkTurn,
    sendTypedMessage,
    skipQuestion,
    switchTopic,
    brainUiState,
    interviewComplete
  } = useInterviewSessionV2(videoRef, interviewType);

  useEffect(() => {
    if (engineDriven && interviewComplete && isStreaming) {
      setHighlightEnd(true);
      setEndHintText('All done! Click "End Interview" to get your feedback.');
    }
  }, [engineDriven, interviewComplete, isStreaming]);

  useEffect(() => {
    if (!isStreaming) {
      setHighlightEnd(false);
      setAttentionNudged(false);
      setEndHintText('');
      return;
    }
    if (engineDriven) return;

    const assistantMessages = chatHistory
      .filter(m => m.role === 'assistant')
      .map(m => (m.content || '').toLowerCase());
    const recent = assistantMessages.slice(-3);
    const combined = recent.join(' • ');

    const wrapUpPhrases = [
      "that's all for today",
      "that's all for now",
      'this concludes',
      'that concludes',
      'we are done',
      "we're done",
      'we have reached the end',
      'this ends the interview',
      'we will stop here',
      "we'll stop here",
      "let's end here",
      'let us end here',
      "let's wrap up",
      'to wrap up',
      'we will conclude',
      "we'll conclude",
      'this demo is complete',
      'the demo is complete',
      "that's the end of our demo",
      'thank you for your time today',
      'thanks for your time today',
    ];

    const primingPhrases = [
      'final question',
      'last question',
      'one last question',
      'final prompt',
      'final topic',
    ];

    const regexes: RegExp[] = [
      /thank(s| you)?[^.!?]{0,40}\b(time|today|chat|speaking|conversation)\b/i,
      /\b(time('?s)?\s*up|out of time|nearly out of time)\b/i,
      /\b(conclude|conclusion|wrap\s*up|end here|stop here)\b/i,
      /\b(this (?:ends|concludes) (?:the )?(?:interview|session|demo))\b/i,
    ];

    const matchedWrapUp = wrapUpPhrases.find(p => combined.includes(p));
    const matchedPriming = primingPhrases.find(p => combined.includes(p));
    const matchedRegex = regexes.find(r => r.test(combined));

    const shouldNudge = Boolean(matchedWrapUp || matchedRegex);
    const shouldPrime = Boolean(matchedPriming);

    if (shouldNudge) {
      if (!highlightEnd) setHighlightEnd(true);
      setEndHintText('Looks like the interviewer finished. Click "End Interview" to get feedback.');
      if (!attentionNudged) {
        setAttentionNudged(true);
        setTimeout(() => {
          controlsContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          document.getElementById('end-interview-button')?.focus();
        }, 150);
        toast({
          title: 'Interview complete',
          description: 'Tap End Interview to finish and get your feedback.',
          duration: 8000,
          action: (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                controlsContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                document.getElementById('end-interview-button')?.focus();
              }}
            >
              End now
            </Button>
          ),
        });
      }
    } else if (shouldPrime && !highlightEnd) {
      setHighlightEnd(true);
      setEndHintText('Final question. When you finish, click "End Interview" to get feedback.');
    }
  }, [chatHistory, isStreaming, attentionNudged, highlightEnd, toast, engineDriven]);

  const handleStartInterview = useCallback(async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to start an interview session.",
        variant: "destructive",
      });
      return;
    }

    try {
      await startInterview(user.id, engineDriven ? (setupChoice ?? { mode: 'mock' }) : undefined);
    } catch (err) {
      console.error('Failed to start interview:', err);
    }
  }, [startInterview, user, toast, engineDriven, setupChoice]);

  const handleStopInterview = useCallback(async () => {
    try {
      setIsGeneratingFeedback(true);

      const transcription = await stopInterview();

      if (transcription && user) {
        const { data, error } = await supabase.functions.invoke('generate-interview-feedback', {
          body: {
            transcription: transcription,
            sessionId: sessionReference || Date.now().toString(),
            userId: user.id,
            interviewType: interviewType.id,
            interviewCategory: interviewType.category,
            scoringSystem: interviewType.scoringSystem,
            sessionReference: sessionReference,
          },
        });

        if (error) {
          console.error('Failed to generate feedback:', error);
          toast({
            title: "Feedback Generation Failed",
            description: "We couldn't generate feedback for your interview. Please try again.",
            variant: "destructive",
          });
        } else {
          setFeedback(data);
          toast({
            title: "Feedback Generated",
            description: "Your interview has been analyzed and feedback is ready!",
          });
        }
      } else if (!transcription) {
        toast({
          title: "No Transcription Available",
          description: "Unable to generate feedback without interview transcription.",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error('Failed to stop interview:', err);
      toast({
        title: "Interview Stop Failed",
        description: "There was an error stopping the interview.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingFeedback(false);
    }
  }, [stopInterview, user, toast]);

  const handleRegenerateFeedback = useCallback(async () => {
    try {
      const t = (feedback as any)?.transcription;
      if (!t || !user) {
        toast({
          title: 'Cannot Regenerate',
          description: 'Missing transcript or user session.',
          variant: 'destructive',
        });
        return;
      }
      setIsGeneratingFeedback(true);
      const { data, error } = await supabase.functions.invoke('generate-interview-feedback', {
        body: {
          transcription: t,
          sessionId: Date.now().toString(),
          userId: user.id,
          interviewType: interviewType.id,
          interviewCategory: interviewType.category,
          scoringSystem: interviewType.scoringSystem,
          sessionReference: sessionReference,
        },
      });
      if (error) {
        console.error('Failed to regenerate feedback:', error);
        toast({
          title: 'Regeneration Failed',
          description: 'Please try again in a moment.',
          variant: 'destructive',
        });
      } else {
        setFeedback(data);
        toast({
          title: 'Feedback Regenerated',
          description: 'We re-analyzed your interview and updated the feedback.',
        });
      }
    } catch (err) {
      console.error('Error during regeneration:', err);
      toast({ title: 'Error', description: 'Unexpected error occurred.', variant: 'destructive' });
    } finally {
      setIsGeneratingFeedback(false);
    }
  }, [feedback, user, interviewType, toast]);

  const toggleAudio = useCallback(() => {
    setIsAudioEnabled(prev => {
      const next = !prev;
      setMicMuted(!next);
      return next;
    });
  }, [setMicMuted]);

  const togglePushToTalk = useCallback(() => {
    setPushToTalk(prev => {
      const next = !prev;
      try { localStorage.setItem('intrvue-ptt', next ? '1' : '0'); } catch { /* private mode */ }
      return next;
    });
  }, []);

  useEffect(() => {
    if (!isStreaming) return;
    setPushToTalkMode(pushToTalk && !typeMode);
    if (typeMode) { setPttHeld(false); setMicMuted(true); return; }
    if (pushToTalk) { setPttHeld(false); setMicMuted(true); }
    else setMicMuted(!isAudioEnabled);
  }, [typeMode, pushToTalk, isStreaming, isAudioEnabled, setMicMuted, setPushToTalkMode]);

  const pttStart = useCallback(() => {
    if (!pushToTalk || !isStreaming) return;
    if (pttMuteTimerRef.current) { clearTimeout(pttMuteTimerRef.current); pttMuteTimerRef.current = null; }
    setPttHeld(true);
    setMicMuted(false);
  }, [pushToTalk, isStreaming, setMicMuted]);

  const pttEnd = useCallback(() => {
    if (!pushToTalk) return;
    setPttHeld(false);
    if (pttMuteTimerRef.current) clearTimeout(pttMuteTimerRef.current);
    // Same 350ms grace period as the mute delay below — gives Deepgram time to finalize whatever
    // was said right up to release before we treat the held turn as complete.
    pttMuteTimerRef.current = setTimeout(() => {
      setMicMuted(true);
      flushPushToTalkTurn();
    }, 350);
  }, [pushToTalk, setMicMuted, flushPushToTalkTurn]);

  useEffect(() => {
    if (!pushToTalk || !isStreaming || typeMode) return;
    const down = (e: KeyboardEvent) => {
      if (e.code !== 'KeyT' || e.repeat) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      e.preventDefault();
      pttStart();
    };
    const up = (e: KeyboardEvent) => {
      if (e.code !== 'KeyT') return;
      e.preventDefault();
      pttEnd();
    };
    const cancel = () => pttEnd();
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', cancel);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', cancel);
    };
  }, [pushToTalk, isStreaming, typeMode, pttStart, pttEnd]);

  useEffect(() => () => { if (pttMuteTimerRef.current) clearTimeout(pttMuteTimerRef.current); }, []);

  const toggleFocusMode = useCallback(async () => {
    const next = !hideTranscript;
    setHideTranscript(next);
    try {
      if (next) await rootRef.current?.requestFullscreen?.();
      else if (document.fullscreenElement) await document.exitFullscreen();
    } catch { /* fullscreen can be blocked; the hide still works */ }
  }, [hideTranscript]);

  useEffect(() => {
    const onFsChange = () => { if (!document.fullscreenElement) setHideTranscript(false); };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  return (
    <div ref={rootRef} className="min-h-screen bg-background text-foreground overflow-y-auto">
      <div className="container mx-auto px-4 py-8 max-w-6xl">

        <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
          <div className="flex items-center gap-3">
            {isStreaming && (
              <span className="flex items-center gap-1.5 rounded-full border border-destructive/30 bg-destructive/10 px-3 py-1.5">
                <span className="h-2 w-2 rounded-full bg-destructive animate-pulsering" />
                <span className="text-[11px] font-extrabold uppercase tracking-wide text-[#FCA5A5]">Recording</span>
              </span>
            )}
            <span className="font-display text-[15px] font-semibold text-white">{interviewType.name}</span>
          </div>
          <div className="flex items-center gap-3">
            {isStreaming && brainUiState && !hideTranscript && (
              <div className="text-[13px] font-extrabold text-white">
                {progressLabel(brainUiState)}
              </div>
            )}
            {isStreaming && (
              <button
                onClick={() => setTypeMode((v) => !v)}
                className={typeMode
                  ? "flex items-center gap-1.5 rounded-full border border-sky/60 bg-sky/15 px-3.5 py-1.5 text-[12.5px] font-extrabold text-sky transition-colors"
                  : "flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.05] px-3.5 py-1.5 text-[12.5px] font-extrabold text-[#C7D2E4] hover:bg-white/10 transition-colors"}
                title="Answer by typing instead of talking (mutes the microphone)"
              >
                <Keyboard className="w-4 h-4" /> Type answers{typeMode ? ': on' : ''}
              </button>
            )}
            {isStreaming && (
              <button
                onClick={togglePushToTalk}
                className={pushToTalk
                  ? "flex items-center gap-1.5 rounded-full border border-primary/60 bg-primary/15 px-3.5 py-1.5 text-[12.5px] font-extrabold text-primary-soft transition-colors"
                  : "flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.05] px-3.5 py-1.5 text-[12.5px] font-extrabold text-[#C7D2E4] hover:bg-white/10 transition-colors"}
                title="When on, the microphone only listens while you hold the talk button (or hold T)"
              >
                <Mic className="w-4 h-4" /> Push to talk{pushToTalk ? ': on' : ''}
              </button>
            )}
            {isStreaming && (
              <button
                onClick={toggleFocusMode}
                className="flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.05] px-3.5 py-1.5 text-[12.5px] font-extrabold text-[#C7D2E4] hover:bg-white/10 transition-colors"
              >
                {hideTranscript ? <><Eye className="w-4 h-4" /> Show transcript</> : <><EyeOff className="w-4 h-4" /> Hide transcript</>}
              </button>
            )}
          </div>
        </div>
        {!isStreaming && !engineDriven && (
          <p className="text-muted-foreground text-sm max-w-2xl mb-5">{interviewType.description}</p>
        )}

        {engineDriven && !setupChoice && !isStreaming && (
          <div className="mb-8">
            <InterviewSetup topics={subjectPack?.topics ?? []} onConfirm={setSetupChoice} note={interviewType.preStartNote} allowTopicPractice={interviewType.topicPracticeEnabled ?? true} />
          </div>
        )}

        {(!engineDriven || setupChoice || isStreaming) && (
        <div className={hideTranscript ? "space-y-6" : "space-y-6 lg:grid lg:grid-cols-3 lg:gap-8 lg:space-y-0"}>

          <div className={hideTranscript ? "" : "lg:col-span-2"}>
            <Card className="p-4 md:p-6 shadow-medium">
              <div className="space-y-4">

                <InterviewStatus
                  isConnected={isConnected}
                  isStreaming={isStreaming}
                  sessionStatus={sessionStatus}
                  error={error}
                />

                {sessionReference && (
                  <div className="text-xs text-muted-foreground text-center">
                    Session: <code className="bg-muted px-1 py-0.5 rounded text-xs">{sessionReference}</code>
                  </div>
                )}

                {isStreaming && (
                  <div className="flex items-center justify-center gap-2 text-xs">
                    <div className={`w-2 h-2 rounded-full ${
                      connectionHealth === 'good' ? 'bg-green-500' :
                      connectionHealth === 'poor' ? 'bg-yellow-500' : 'bg-red-500'
                    }`} />
                    <span className="text-muted-foreground">
                      Connection: {connectionHealth}
                    </span>
                  </div>
                )}

                <div className="relative bg-muted rounded-2xl overflow-hidden aspect-video md:aspect-[16/10] lg:aspect-[16/9]">
                  <video
                    ref={videoRef}
                    id="interview-video"
                    autoPlay
                    playsInline
                    muted={false}
                    className="w-full h-full object-cover"
                  />

                  {isStreaming && (
                    <span className="absolute top-4 left-4 z-10 flex items-center gap-1.5 rounded-full bg-primary/90 px-3.5 py-1.5 text-xs font-bold text-white">
                      <span className="h-1.5 w-1.5 rounded-full bg-white" /> Live
                    </span>
                  )}

                  {/* Live caption of what Deepgram currently hears — not in V1, this pipeline has it for free. */}
                  {isStreaming && liveCaption && (
                    <span className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 max-w-[85%] rounded-full bg-black/60 px-4 py-2 text-xs text-white/90 truncate">
                      {liveCaption}
                    </span>
                  )}

                  {isStreaming && pushToTalk && !typeMode && (
                    <button
                      type="button"
                      onMouseDown={pttStart}
                      onMouseUp={pttEnd}
                      onMouseLeave={pttEnd}
                      onTouchStart={(e) => { e.preventDefault(); pttStart(); }}
                      onTouchEnd={(e) => { e.preventDefault(); pttEnd(); }}
                      onTouchCancel={pttEnd}
                      onContextMenu={(e) => e.preventDefault()}
                      className={`absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 rounded-full px-6 py-3.5 text-[14px] font-extrabold text-white select-none touch-none transition-all ${
                        pttHeld
                          ? 'bg-gradient-to-br from-[#FB923C] to-[#F1730B] animate-pulsering scale-105'
                          : 'bg-black/55 border border-white/20 backdrop-blur-sm hover:bg-black/70'
                      }`}
                    >
                      {pttHeld ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                      {pttHeld ? "I'm listening — release when done" : 'Hold to speak · or hold T'}
                    </button>
                  )}

                  {!isStreaming && (
                    <div
                      className="absolute inset-0 flex items-center justify-center"
                      style={{ background: 'repeating-linear-gradient(45deg, hsl(211 28% 20%) 0px, hsl(211 28% 20%) 14px, hsl(211 26% 22%) 14px, hsl(211 26% 22%) 28px)' }}
                    >
                      <div className="text-center space-y-4">
                        <div className="w-16 h-16 md:w-24 md:h-24 bg-primary/15 rounded-full flex items-center justify-center mx-auto">
                          <Mic className="w-8 h-8 md:w-12 md:h-12 text-primary" />
                        </div>
                        <p className="text-sm md:text-base text-cream/60 font-medium px-4">
                          {isConnected ? 'Ready to start interview' : 'Connect to begin'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {isStreaming && typeMode && (
                  <form
                    className="flex gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!typedText.trim()) return;
                      sendTypedMessage(typedText);
                      setTypedText('');
                    }}
                  >
                    <input
                      value={typedText}
                      onChange={(e) => setTypedText(e.target.value)}
                      placeholder="Type your answer to Clara and press Enter…"
                      autoFocus
                      className="flex-1 rounded-full border border-white/12 bg-white/[0.05] px-4 py-2.5 text-sm font-semibold text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-sky/60"
                    />
                    <Button type="submit" size="sm" disabled={!typedText.trim()} className="rounded-full min-h-[42px] px-4 gap-1.5">
                      <Send className="w-4 h-4" /> Send
                    </Button>
                  </form>
                )}

                <div className="flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleAudio}
                    disabled={pushToTalk}
                    className="gap-2 w-full sm:w-auto min-h-[44px]"
                    title={pushToTalk ? 'Push to talk is on — hold the talk button to speak' : undefined}
                  >
                    {pushToTalk ? (
                      <>
                        <MicOff className="w-4 h-4" />
                        <span className="text-sm">Push to talk on</span>
                      </>
                    ) : isAudioEnabled ? (
                      <>
                        <Mic className="w-4 h-4" />
                        <span className="text-sm">Microphone On</span>
                      </>
                    ) : (
                      <>
                        <MicOff className="w-4 h-4" />
                        <span className="text-sm">Microphone Off</span>
                      </>
                    )}
                  </Button>

                  <div className="w-full sm:w-auto">
                    <InterviewTimer
                      isActive={isStreaming}
                      duration={interviewType.duration}
                      onTimeUp={() => {
                        toast({
                          title: "Time's Up!",
                          description: `Your ${interviewType.duration}-minute interview session has ended.`,
                          variant: "destructive",
                        });
                        handleStopInterview();
                      }}
                    />
                  </div>
                </div>
              </div>
            </Card>

            <div className="mt-4 md:mt-6" ref={controlsContainerRef} id="interview-controls">
              <InterviewControls
                isStreaming={isStreaming}
                onStartInterview={handleStartInterview}
                onStopInterview={handleStopInterview}
                disabled={!!error}
                highlightEnd={highlightEnd}
                endHint={endHintText || undefined}
                onSkipQuestion={engineDriven ? skipQuestion : undefined}
                topics={
                  engineDriven && brainUiState?.mode === 'practice'
                    ? subjectPack?.topics.map((t) => ({ id: t.id, label: t.label }))
                    : undefined
                }
                onSwitchTopic={engineDriven ? switchTopic : undefined}
              />
            </div>
          </div>

          {!hideTranscript && (
          <div className="lg:block space-y-4">
            {isStreaming && brainUiState && (
              <div className="tile p-5">
                <div className="text-[11px] font-extrabold uppercase tracking-wide text-[#7E8BA6] mb-2">
                  {brainUiState.phase === 'about-you' ? 'Part 1 · About you' : brainUiState.phase === 'challenge' ? 'Part 2 · The challenge' : 'Progress'}
                </div>
                <div className="text-[15px] font-bold text-[#EAF0FA] leading-relaxed capitalize">
                  {progressLabel(brainUiState)}
                  {brainUiState.phase !== 'about-you' && brainUiState.topic ? ` · ${brainUiState.topic.replace(/-/g, ' ')}` : ''}
                </div>
                <div className="mt-4 flex gap-1.5 flex-wrap">
                  {(() => {
                    const { count, idx } = phaseDots(brainUiState);
                    return Array.from({ length: count }).map((_, i) => (
                      <span
                        key={i}
                        className="h-2 w-[22px] rounded-full"
                        style={{ background: i < idx ? 'hsl(var(--emerald))' : i === idx ? 'hsl(var(--primary))' : 'rgba(255,255,255,.1)' }}
                      />
                    ));
                  })()}
                </div>
              </div>
            )}
            <ChatHistory
              messages={chatHistory}
              isStreaming={isStreaming}
            />
          </div>
          )}
        </div>
        )}

        {(feedback || isGeneratingFeedback) && (
          <div className="mt-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Your Interview Feedback</h2>
              <Button
                variant="secondary"
                onClick={handleRegenerateFeedback}
                disabled={isGeneratingFeedback || !feedback}
                className="gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                {isGeneratingFeedback ? 'Regenerating…' : 'Regenerate Feedback'}
              </Button>
            </div>
            <FeedbackVersions
              feedback={feedback}
              isLoading={isGeneratingFeedback}
              interviewType={interviewType.id}
              scoringSystem={interviewType.scoringSystem}
            />
            {feedback && !isGeneratingFeedback && (
              <ShareFeedbackBox
                sessionReference={sessionReference}
                interviewType={interviewType.id}
                transcript={(feedback as any)?.transcription}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};
