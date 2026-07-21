/**
 * First-time-user guided tour — a spotlight overlay driven entirely by real, live DOM elements
 * (tagged `data-tour="<key>"` wherever they render, across Dashboard/QuestionsHub/AchievementsPage/
 * LockerRoom/FeedbackHistory and the Index.tsx nav).
 *
 * How it stays in sync with the real UI: each step re-measures its target's
 * `getBoundingClientRect()` on mount, next frame (catches late webfont/image layout), window
 * resize, ANY scroll (capture phase, so inner scroll containers count too), and via a
 * ResizeObserver on the target itself. Nothing is drawn until that first measurement lands, so
 * there's never a flash at a stale (0,0) rect. If a target never appears (e.g. no daily question
 * seeded for `qotd`), a watchdog auto-advances past it after a couple of seconds rather than
 * stalling the tour silently.
 *
 * Two kinds of step (`kind`):
 * - 'element' (default): spotlights one specific real element with a ring + a hole in the dimming.
 * - 'page': a brief whole-page orientation when arriving somewhere new — dims everything (no ring,
 *   since ringing an entire page is visually pointless) and shows a banner message.
 *
 * Two ways a step advances (`advanceMode`):
 * - 'click' (nav items, the locker-room link, the hat card): the student clicks the real,
 *   still-fully-functional target. A capture-phase document click listener watches for
 *   `data-tour="<currentKey>"` without ever calling preventDefault/stopPropagation, so the
 *   target's own onClick (navigate, equip a hat, etc.) still fires exactly as normal.
 * - 'button' (page-intro steps, and the dashboard hero tile): the target is spotlighted but made
 *   genuinely non-interactive (a transparent pane over it swallows clicks), and the bubble shows
 *   an explicit "Next" button instead. This exists because some real onClicks navigate away from
 *   the current page — if allowed to fire mid-tour, the next step's target could unmount before
 *   the tour ever gets to it, stalling silently.
 */
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Pip } from '@/components/brand/Pip';
import { X } from 'lucide-react';
import { HowItWorksModal } from './HowItWorksModal';

interface TourStep {
  key: string;
  message: string;
  advanceMode?: 'click' | 'button';
  kind?: 'page' | 'element';
}

export const TOUR_STEPS: TourStep[] = [
  { key: 'page-dashboard', message: "Welcome to your dashboard — home base for everything. Let's take a quick look around!", advanceMode: 'button', kind: 'page' },
  { key: 'start-interview', message: "This is where you'll start your mock interviews whenever you're ready.", advanceMode: 'button' },
  { key: 'qotd', message: "Try today's Question of the Day for some quick warm-up practice!", advanceMode: 'button' },
  { key: 'nav-questions', message: 'Head to the Questions Hub for more daily practice, any time you like.' },
  { key: 'page-questions', message: 'This is the Questions Hub — practise questions, review ones you got wrong, and try quick rounds.', advanceMode: 'button', kind: 'page' },
  { key: 'nav-achievements', message: 'Your trophy cabinet lives here — badges you earn unlock hats for Pip in the locker room.' },
  { key: 'page-achievements', message: "You've already unlocked the Beta Tester badge! Keep practising to earn more.", advanceMode: 'button', kind: 'page' },
  { key: 'locker-link', message: "Badges unlock hats for Pip — let's go try one on." },
  { key: 'locker-hat', message: 'Go on, try it on!' },
  { key: 'nav-history', message: 'See all your past interviews and feedback here.' },
  { key: 'page-history', message: "Oh — looks empty right now! Let's fix that with your first interview.", advanceMode: 'button', kind: 'page' },
  { key: 'nav-practice', message: 'Last stop — this is where every interview starts. Click Practice to see how it all works!' },
];

const BUBBLE_W = 300;
const BUBBLE_H = 176;
const GAP = 14;
const EDGE_PAD = 10;
const HOLE_PAD = 8;
/** If a step's target hasn't been found by this long after becoming active, skip it rather than
 *  stall the tour forever (e.g. no Question of the Day seeded for today). */
const STALL_SKIP_MS = 2500;

/** Some tour keys have more than one matching element in the DOM at once (desktop nav pill vs.
 *  mobile icon button, shown/hidden purely via CSS media queries) — pick whichever one is
 *  actually visible right now. */
export function findVisibleTarget(key: string): HTMLElement | null {
  const els = document.querySelectorAll<HTMLElement>(`[data-tour="${key}"]`);
  for (const el of els) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return el;
  }
  return null;
}

type BubblePos =
  | { mode: 'below' | 'above'; top: number; left: number; arrowLeft: number }
  | { mode: 'left' | 'right'; top: number; left: number; arrowTop: number }
  | { mode: 'banner' };

export function computeBubblePos(rect: DOMRect, vw: number, vh: number): BubblePos {
  const targetCenterX = rect.left + rect.width / 2;
  const targetCenterY = rect.top + rect.height / 2;
  const clampLeft = (l: number) => Math.min(Math.max(EDGE_PAD, l), vw - BUBBLE_W - EDGE_PAD);
  const clampTop = (t: number) => Math.min(Math.max(EDGE_PAD, t), vh - BUBBLE_H - EDGE_PAD);

  if (rect.bottom + GAP + BUBBLE_H <= vh - EDGE_PAD) {
    const left = clampLeft(targetCenterX - BUBBLE_W / 2);
    return { mode: 'below', top: rect.bottom + GAP, left, arrowLeft: Math.min(Math.max(16, targetCenterX - left), BUBBLE_W - 16) };
  }
  if (rect.top - GAP - BUBBLE_H >= EDGE_PAD) {
    const left = clampLeft(targetCenterX - BUBBLE_W / 2);
    return { mode: 'above', top: rect.top - GAP - BUBBLE_H, left, arrowLeft: Math.min(Math.max(16, targetCenterX - left), BUBBLE_W - 16) };
  }
  if (rect.right + GAP + BUBBLE_W <= vw - EDGE_PAD) {
    const top = clampTop(targetCenterY - BUBBLE_H / 2);
    return { mode: 'right', top, left: rect.right + GAP, arrowTop: Math.min(Math.max(16, targetCenterY - top), BUBBLE_H - 16) };
  }
  if (rect.left - GAP - BUBBLE_W >= EDGE_PAD) {
    const top = clampTop(targetCenterY - BUBBLE_H / 2);
    return { mode: 'left', top, left: rect.left - GAP - BUBBLE_W, arrowTop: Math.min(Math.max(16, targetCenterY - top), BUBBLE_H - 16) };
  }
  return { mode: 'banner' };
}

/**
 * Measures a `data-tour="<key>"` target's rect (+ its computed border-radius, + the viewport size)
 * and keeps it current: next frame (late layout), window resize, any scroll (capture phase), and a
 * ResizeObserver on the target itself. `rect` is cleared immediately when `key` changes or
 * `active` goes false, so a stale rect from a previous target/state is never drawn against a new
 * one. The target is scrolled into view (smooth, centered) once per step, the first time it's
 * found — this is what carries the student down to things below the fold (e.g. the locker-room
 * link near the bottom of the Achievements page) without them needing to scroll manually. Shared
 * by TourOverlay (production, auth-gated) and the dev-only test harness, so the harness exercises
 * this exact measurement code rather than a hand-copied approximation of it.
 */
export function useTourTarget(key: string, active: boolean) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [ringRadius, setRingRadius] = useState('16px');
  const [viewport, setViewport] = useState({ w: 0, h: 0 });
  const targetElRef = useRef<HTMLElement | null>(null);
  const scrolledRef = useRef(false);

  useEffect(() => {
    setRect(null);
    targetElRef.current = null;
    scrolledRef.current = false;
    if (!active) return undefined;

    let ro: ResizeObserver | null = null;
    let raf = 0;

    const doMeasure = () => {
      const el = findVisibleTarget(key);
      targetElRef.current = el;
      if (!el) { setRect(null); return; }
      if (!scrolledRef.current) {
        scrolledRef.current = true;
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      setRect(el.getBoundingClientRect());
      setRingRadius(getComputedStyle(el).borderRadius || '16px');
      if (!ro) {
        ro = new ResizeObserver(doMeasure);
        ro.observe(el);
      }
    };

    doMeasure();
    raf = requestAnimationFrame(doMeasure);
    setViewport({ w: window.innerWidth, h: window.innerHeight });

    const onWin = () => { doMeasure(); setViewport({ w: window.innerWidth, h: window.innerHeight }); };
    window.addEventListener('resize', onWin);
    window.addEventListener('scroll', onWin, true);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onWin);
      window.removeEventListener('scroll', onWin, true);
      ro?.disconnect();
    };
  }, [active, key]);

  return { rect, ringRadius, viewport };
}

/**
 * Advances the tour ONLY when the real, currently-highlighted target is clicked — observes via a
 * capture-phase listener, never calls preventDefault/stopPropagation, so the target's own onClick
 * (navigate, equip a hat, etc.) still fires exactly as it would without the tour running. Pass
 * `enabled=false` for 'button'-mode steps, where advancing happens via the bubble's own button.
 */
export function useTourAdvance(enabled: boolean, rect: DOMRect | null, key: string, onAdvance: () => void) {
  useEffect(() => {
    if (!enabled || !rect) return undefined;
    const onClick = (e: MouseEvent) => {
      const el = (e.target as HTMLElement)?.closest?.(`[data-tour="${key}"]`);
      if (!el) return;
      onAdvance();
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [enabled, rect, key, onAdvance]);
}

/** Skip a step whose target never shows up (nothing found within STALL_SKIP_MS of it becoming
 *  active) instead of leaving the tour silently stuck with no visible target. */
function useStallWatchdog(active: boolean, rect: DOMRect | null, stepKey: string, onSkip: () => void) {
  useEffect(() => {
    if (!active || rect) return undefined;
    const t = setTimeout(onSkip, STALL_SKIP_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, rect, stepKey]);
}

export function TourOverlay({ suspended = false, restartKey = 0 }: { suspended?: boolean; restartKey?: number }) {
  const { user } = useAuth();
  const [phase, setPhase] = useState<'idle' | 'active' | 'done'>('idle');
  const [stepIndex, setStepIndex] = useState(0);
  const [showHowItWorks, setShowHowItWorks] = useState(false);

  // Decide once per user whether they've already seen the tour.
  useEffect(() => {
    if (!user || phase !== 'idle') return;
    setPhase(user.user_metadata?.hasSeenTour ? 'done' : 'active');
  }, [user, phase]);

  // Bumping restartKey (e.g. a "Replay tour" test button) force-restarts from step 1, regardless
  // of hasSeenTour. Skipped on the very first render (restartKey starts at 0 with no prior value).
  const prevRestartKey = useRef(restartKey);
  useEffect(() => {
    if (restartKey === prevRestartKey.current) return;
    prevRestartKey.current = restartKey;
    setStepIndex(0);
    setPhase('active');
  }, [restartKey]);

  const markSeen = useCallback(() => {
    setPhase('done');
    supabase.auth.updateUser({ data: { hasSeenTour: true } }).catch((e) => {
      console.warn('Failed to save tour completion:', e);
    });
  }, []);

  const active = phase === 'active' && !suspended;
  const currentStep = TOUR_STEPS[stepIndex];
  const isButtonMode = currentStep.advanceMode === 'button';
  const isPageKind = currentStep.kind === 'page';
  const { rect, ringRadius, viewport } = useTourTarget(currentStep.key, active);

  const handleAdvance = useCallback(() => {
    setStepIndex((i) => {
      if (i === TOUR_STEPS.length - 1) return i; // finish handled below, not by index
      return i + 1;
    });
  }, []);
  const handleFinish = useCallback(() => {
    markSeen();
    setShowHowItWorks(true);
  }, [markSeen]);
  const advanceOrFinish = useCallback(() => {
    if (stepIndex === TOUR_STEPS.length - 1) handleFinish();
    else handleAdvance();
  }, [stepIndex, handleAdvance, handleFinish]);

  useTourAdvance(active && !isButtonMode, rect, currentStep.key, advanceOrFinish);
  useStallWatchdog(active, rect, currentStep.key, handleAdvance);

  return (
    <>
      {active && rect && viewport.w > 0 && (
        <TourVisuals
          rect={rect}
          ringRadius={ringRadius}
          viewport={viewport}
          step={stepIndex}
          message={currentStep.message}
          onSkip={markSeen}
          clickable={!isButtonMode}
          isPageKind={isPageKind}
          onNext={isButtonMode ? advanceOrFinish : undefined}
        />
      )}
      <HowItWorksModal open={showHowItWorks} onOpenChange={setShowHowItWorks} />
    </>
  );
}

export function TourVisuals({
  rect, ringRadius, viewport, step, message, onSkip, clickable = true, isPageKind = false, onNext,
}: {
  rect: DOMRect; ringRadius: string; viewport: { w: number; h: number }; step: number; message: string;
  onSkip: () => void; clickable?: boolean; isPageKind?: boolean; onNext?: () => void;
}) {
  const dim = 'hsl(var(--background) / 0.82)';

  // Page-kind steps: a brief "here's this page" orientation, not a spotlight — greying out the
  // whole page you're being shown makes no sense, so there's no dim, no ring, nothing covering
  // the real page at all. Just the banner floating over a fully normal, fully visible page.
  if (isPageKind) {
    return <TourBubble bubble={{ mode: 'banner' }} step={step} message={message} onSkip={onSkip} onNext={onNext} />;
  }

  const holeTop = rect.top - HOLE_PAD;
  const holeLeft = rect.left - HOLE_PAD;
  const holeW = rect.width + HOLE_PAD * 2;
  const holeH = rect.height + HOLE_PAD * 2;

  const bubble = computeBubblePos(rect, viewport.w, viewport.h);

  return (
    <div className="fixed inset-0 z-[9998]" style={{ pointerEvents: 'none' }} aria-hidden="true">
      {/* Four blocking/dimming strips tile the whole viewport EXCEPT the hole — this is what makes
          only the target clickable (box-shadow-based cutouts are purely visual and don't block
          clicks, so we use real elements here instead). */}
      <div className="fixed inset-x-0 top-0 transition-all duration-200" style={{ height: Math.max(0, holeTop), background: dim, pointerEvents: 'auto' }} />
      <div className="fixed inset-x-0 bottom-0 transition-all duration-200" style={{ top: holeTop + holeH, background: dim, pointerEvents: 'auto' }} />
      <div className="fixed left-0 transition-all duration-200" style={{ top: holeTop, height: holeH, width: Math.max(0, holeLeft), background: dim, pointerEvents: 'auto' }} />
      <div className="fixed right-0 transition-all duration-200" style={{ top: holeTop, height: holeH, left: holeLeft + holeW, background: dim, pointerEvents: 'auto' }} />

      {/* 'button'-mode steps: the hole above is purely visual (keeps the target looking
          spotlighted/undimmed like every other step) — this invisible pane sits over just the
          hole and swallows clicks, so the real element genuinely cannot be triggered; the bubble's
          "Next" button is the only way to advance. */}
      {!clickable && (
        <div className="fixed transition-all duration-200" style={{ top: holeTop, left: holeLeft, width: holeW, height: holeH, pointerEvents: 'auto' }} />
      )}

      {/* Spotlight ring around the target */}
      <div
        className="fixed transition-all duration-200"
        style={{
          top: holeTop, left: holeLeft, width: holeW, height: holeH,
          borderRadius: ringRadius,
          border: '3px solid hsl(var(--primary))',
          boxShadow: '0 0 0 6px hsl(var(--primary) / 0.22), 0 0 26px 4px hsl(var(--primary) / 0.35)',
        }}
      />

      <TourBubble bubble={bubble} step={step} message={message} onSkip={onSkip} onNext={onNext} />
    </div>
  );
}

export function TourBubble({
  bubble, step, message, onSkip, onNext,
}: { bubble: BubblePos; step: number; message: string; onSkip: () => void; onNext?: () => void }) {
  const skipButton = (
    <button
      onClick={onSkip}
      aria-label="Skip tour"
      title="Skip tour"
      style={{ pointerEvents: 'auto' }}
      className="absolute top-3 right-3 flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground hover:bg-white/10 hover:text-white transition-colors"
    >
      <X className="h-3.5 w-3.5" />
    </button>
  );

  const dots = (
    <div className="flex gap-1">
      {TOUR_STEPS.map((_, i) => (
        <span key={i} className="h-1.5 w-1.5 rounded-full" style={{ background: i === step ? 'hsl(var(--primary))' : 'rgba(255,255,255,.18)' }} />
      ))}
    </div>
  );

  const nextButton = onNext && (
    <button
      onClick={onNext}
      aria-label="Next step"
      style={{ pointerEvents: 'auto' }}
      className="flex-none rounded-full bg-primary px-5 py-2 text-[12.5px] font-extrabold text-white shadow-lg shadow-primary/25 hover:bg-primary/90 transition-colors"
    >
      Next →
    </button>
  );

  if (bubble.mode === 'banner') {
    return (
      <div
        className="tile fixed left-1/2 -translate-x-1/2 bottom-5 flex items-center gap-4 py-4 pl-5 pr-10 max-w-[92vw]"
        style={{ pointerEvents: 'auto' }}
      >
        {skipButton}
        <Pip size={44} className="flex-none" float />
        <p className="text-[14px] font-semibold text-[#EAF0FA] leading-snug max-w-[420px]">{message}</p>
        <div className="flex-none flex items-center gap-3.5 pl-2">
          {dots}
          {nextButton}
        </div>
      </div>
    );
  }

  const arrowBase = 'absolute w-0 h-0';
  let arrowStyle: CSSProperties = {};
  if (bubble.mode === 'below') arrowStyle = { top: -8, left: bubble.arrowLeft - 8, borderLeft: '8px solid transparent', borderRight: '8px solid transparent', borderBottom: '8px solid hsl(var(--card))' };
  else if (bubble.mode === 'above') arrowStyle = { bottom: -8, left: bubble.arrowLeft - 8, borderLeft: '8px solid transparent', borderRight: '8px solid transparent', borderTop: '8px solid hsl(var(--card))' };
  else if (bubble.mode === 'right') arrowStyle = { left: -8, top: bubble.arrowTop - 8, borderTop: '8px solid transparent', borderBottom: '8px solid transparent', borderRight: '8px solid hsl(var(--card))' };
  else if (bubble.mode === 'left') arrowStyle = { right: -8, top: bubble.arrowTop - 8, borderTop: '8px solid transparent', borderBottom: '8px solid transparent', borderLeft: '8px solid hsl(var(--card))' };

  return (
    <div
      className="tile fixed p-4 pr-9 transition-all duration-200"
      style={{ top: bubble.top, left: bubble.left, width: BUBBLE_W, pointerEvents: 'auto' }}
    >
      <div className={arrowBase} style={arrowStyle} />
      {skipButton}
      <div className="flex items-start gap-3">
        <Pip size={40} className="flex-none" float />
        <p className="text-[13px] font-semibold text-[#EAF0FA] leading-relaxed">{message}</p>
      </div>
      <div className="mt-3.5 flex items-center justify-between gap-2">
        {dots}
        {nextButton}
      </div>
    </div>
  );
}
