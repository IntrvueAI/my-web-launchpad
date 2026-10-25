import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { ArrowLeft, ArrowRight, Check, Flame, Leaf, Lightbulb, Search, Sparkles, TrendingUp, Trophy, X, Zap } from 'lucide-react';
import { Pip } from '@/components/brand/Pip';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import {
  buildMiniPlan,
  INTENSITY_OPTIONS,
  LEVEL_OPTIONS,
  type ExperienceLevel,
  type SchoolEntry,
  type StudyIntensity,
} from '@/data/onboarding/studyPlan';

/**
 * Post-signup onboarding: name -> schools -> experience -> pace -> a generated starter plan. On
 * the last step it saves the name and chosen schools to the profile (and level/pace to user
 * metadata) and hands off to the caller, which continues into the guided tour. Interview dates
 * aren't collected here; schools picked here have no date until one is added in Settings.
 */

type Step = 'name' | 'schools' | 'level' | 'intensity' | 'plan';
const STEPS: { id: Step; label: string }[] = [
  { id: 'name', label: 'Your name' },
  { id: 'schools', label: 'Schools' },
  { id: 'level', label: 'Experience' },
  { id: 'intensity', label: 'Pace' },
  { id: 'plan', label: 'Your plan' },
];
const LEVEL_ICONS: Record<ExperienceLevel, LucideIcon> = { 'new': Sparkles, 'some-practice': TrendingUp, 'almost-ready': Trophy };
const INTENSITY_ICONS: Record<StudyIntensity, LucideIcon> = { light: Leaf, steady: Zap, intense: Flame };
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
// Disabled primary buttons read as "not yet", not as a muddy version of the brand colour.
const PRIMARY = 'min-h-12 gap-2 rounded-full px-6 font-semibold disabled:bg-muted disabled:text-muted-foreground disabled:opacity-100 disabled:shadow-none';

function useSchoolsData() {
  const [schools, setSchools] = useState<SchoolEntry[]>([]);
  useEffect(() => {
    let cancelled = false;
    fetch('/data/uk-schools-master-list.json')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => { if (!cancelled && Array.isArray(data)) setSchools(data); })
      .catch(() => { /* Search just comes back empty — not fatal. */ });
    return () => { cancelled = true; };
  }, []);
  return schools;
}

export function OnboardingFlow({ userId, onComplete }: { userId: string; onComplete: () => void }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [name, setName] = useState('');
  const [selectedSchools, setSelectedSchools] = useState<SchoolEntry[]>([]);
  const [level, setLevel] = useState<ExperienceLevel | null>(null);
  const [intensity, setIntensity] = useState<StudyIntensity | null>(null);
  const [saving, setSaving] = useState(false);
  const reduceMotion = useReducedMotion();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const schools = useSchoolsData();
  const step = STEPS[stepIndex].id;
  const firstName = name.trim().split(/\s+/)[0] ?? '';

  const canContinue =
    step === 'name' ? name.trim().length > 0 :
    step === 'schools' ? selectedSchools.length > 0 :
    step === 'level' ? level !== null :
    step === 'intensity' ? intensity !== null : true;

  const go = (next: number) => {
    setDirection(next > stepIndex ? 1 : -1);
    setStepIndex(Math.max(0, Math.min(STEPS.length - 1, next)));
  };
  const goNext = () => { if (canContinue || step === 'schools') go(stepIndex + 1); };

  // Move focus to each new step's heading so keyboard and screen-reader users follow along.
  useEffect(() => {
    if (step !== 'name') headingRef.current?.focus({ preventScroll: true });
  }, [step]);

  const finish = async () => {
    setSaving(true);
    try {
      const trimmedName = name.trim();
      await Promise.all([
        supabase
          .from('profiles')
          .update({
            full_name: trimmedName || null,
            school_interviews: selectedSchools.map((s) => ({ school: s.name, interview_date: null as string | null })),
            schools: selectedSchools.length > 0 ? selectedSchools.map((s) => s.name) : null,
          })
          .eq('id', userId),
        // No profiles columns for these yet — stored in user_metadata alongside hasSeenTour,
        // read back by the Feedback page's "on target" pacing card (see studyPlan.ts).
        supabase.auth.updateUser({
          data: { ...(trimmedName ? { full_name: trimmedName } : {}), study_intensity: intensity, experience_level: level },
        }),
      ]);
    } catch (e) {
      console.warn('Failed to save onboarding details:', e);
    } finally {
      setSaving(false);
      onComplete();
    }
  };

  const plan = useMemo(() => (level && intensity ? buildMiniPlan(level, intensity, selectedSchools) : null), [level, intensity, selectedSchools]);
  const answers: Record<Step, string | null> = {
    name: name.trim() || null,
    schools: selectedSchools.length ? `${selectedSchools.length} school${selectedSchools.length === 1 ? '' : 's'}` : stepIndex > 1 ? 'Not sure yet' : null,
    level: LEVEL_OPTIONS.find((o) => o.id === level)?.label ?? null,
    intensity: INTENSITY_OPTIONS.find((o) => o.id === intensity)?.label ?? null,
    plan: null,
  };

  const heading: Record<Step, { title: string; sub: string }> = {
    name: { title: "Hi, I'm Pip. What's your name?", sub: "We'll use it on your dashboard and in your feedback." },
    schools: { title: `Which schools are you applying to${firstName ? `, ${firstName}` : ''}?`, sub: 'Add as many as you like. You can change this later in Settings.' },
    level: { title: 'How much interview practice have you had?', sub: "There's no wrong answer. It just sets where we start." },
    intensity: { title: 'How often would you like to practise?', sub: 'Pick a pace that fits your week. You can change it any time.' },
    plan: { title: `Your starter plan${firstName ? `, ${firstName}` : ''}`, sub: "Built from your answers. Next, a quick tour of your dashboard." },
  };

  const primary = step === 'plan' ? (
    <Button onClick={() => void finish()} disabled={saving} className={PRIMARY}>
      {saving ? 'Saving…' : 'Go to my dashboard'} <ArrowRight className="h-4 w-4" aria-hidden />
    </Button>
  ) : (
    <Button onClick={goNext} disabled={!canContinue} className={PRIMARY}>
      Continue <ArrowRight className="h-4 w-4" aria-hidden />
    </Button>
  );
  const skipSchools = step === 'schools' && selectedSchools.length === 0 && (
    <button type="button" onClick={() => go(stepIndex + 1)} className="min-h-11 px-2 text-sm font-semibold text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
      I'm not sure yet
    </button>
  );

  return (
    <div className="min-h-[100dvh] bg-background text-foreground lg:grid lg:grid-cols-[minmax(300px,380px)_1fr]">
      {/* Desktop rail: where you are, and what you've told us so far. */}
      <aside className="hidden border-r border-border/60 bg-card/40 lg:flex lg:flex-col lg:px-10 lg:py-10" aria-label="Setup progress">
        <img src="/lovable-uploads/logo.png" alt="intrvue.ai" className="h-7 w-auto self-start" />
        <div className="mt-14 flex items-center gap-3">
          <Pip size={52} float />
          <div>
            <p className="font-display text-lg font-semibold">Let's set you up</p>
            <p className="text-sm text-muted-foreground">Five quick questions, about a minute.</p>
          </div>
        </div>
        <ol className="mt-10 space-y-1">
          {STEPS.map((s, i) => {
            const done = i < stepIndex;
            const current = i === stepIndex;
            return (
              <li key={s.id}>
                <button
                  type="button"
                  disabled={!done}
                  onClick={() => go(i)}
                  aria-current={current ? 'step' : undefined}
                  className={cn('flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors', done && 'hover:bg-muted/60', current && 'bg-muted/60')}
                >
                  <span className={cn(
                    'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold',
                    done ? 'border-primary bg-primary text-primary-foreground' : current ? 'border-primary text-primary' : 'border-border text-muted-foreground',
                  )}>
                    {done ? <Check className="h-3.5 w-3.5" aria-hidden /> : i + 1}
                  </span>
                  <span className="min-w-0">
                    <span className={cn('block text-sm font-semibold', !done && !current && 'text-muted-foreground')}>{s.label}</span>
                    {done && answers[s.id] && <span className="block truncate text-xs text-muted-foreground">{answers[s.id]}</span>}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
        <p className="mt-auto pt-10 text-xs text-muted-foreground">You can change any of this later in Settings.</p>
      </aside>

      <div className="flex min-h-[100dvh] flex-col">
        {/* Phone header: back, step count and progress. */}
        <header className="sticky top-0 z-20 border-b border-border/60 bg-background/90 backdrop-blur lg:hidden">
          <div className="flex h-14 items-center justify-between px-4">
            <button type="button" onClick={() => go(stepIndex - 1)} aria-label="Back"
              className={cn('flex h-10 w-10 items-center justify-center rounded-full hover:bg-muted', stepIndex === 0 && 'invisible')}>
              <ArrowLeft className="h-5 w-5" aria-hidden />
            </button>
            <img src="/lovable-uploads/logo.png" alt="intrvue.ai" className="h-6 w-auto" />
            <span className="w-10 text-right text-xs font-semibold text-muted-foreground">{stepIndex + 1}/{STEPS.length}</span>
          </div>
          <div className="h-1 bg-muted" role="progressbar" aria-label="Setup progress" aria-valuemin={1} aria-valuemax={STEPS.length} aria-valuenow={stepIndex + 1}>
            <div className="h-full bg-primary transition-[width] duration-300" style={{ width: `${((stepIndex + 1) / STEPS.length) * 100}%` }} />
          </div>
        </header>

        <main className="flex flex-1 flex-col px-5 pb-32 pt-8 sm:px-8 lg:items-center lg:justify-center lg:pb-16 lg:pt-16">
          <div className="w-full max-w-xl">
            <AnimatePresence mode="wait" custom={direction} initial={false}>
              <motion.section
                key={step}
                custom={direction}
                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: direction * 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: direction * -24 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                aria-labelledby="onboarding-heading"
              >
                <p className="text-xs font-semibold uppercase tracking-widest text-primary">Step {stepIndex + 1} of {STEPS.length}</p>
                <div className="mt-3 flex items-start gap-3">
                  {step === 'name' && <Pip size={44} className="shrink-0 lg:hidden" float />}
                  <h1 id="onboarding-heading" ref={headingRef} tabIndex={-1} className="font-display text-[28px] font-semibold leading-tight outline-none sm:text-[34px]">
                    {heading[step].title}
                  </h1>
                </div>
                <p className="mt-3 text-base text-muted-foreground">{heading[step].sub}</p>

                <div className="mt-8">
                  {step === 'name' && <NameStep name={name} onChange={setName} onEnter={goNext} />}
                  {step === 'schools' && <SchoolsStep schools={schools} selected={selectedSchools} onChange={setSelectedSchools} />}
                  {step === 'level' && (
                    <ChoiceList
                      label="Interview experience"
                      options={LEVEL_OPTIONS.map((o) => ({ id: o.id, label: o.label, detail: o.blurb, icon: LEVEL_ICONS[o.id] }))}
                      value={level}
                      onChange={(v) => setLevel(v as ExperienceLevel)}
                      onConfirm={goNext}
                    />
                  )}
                  {step === 'intensity' && (
                    <ChoiceList
                      label="Practice pace"
                      options={INTENSITY_OPTIONS.map((o) => ({ id: o.id, label: o.label, detail: o.blurb, icon: INTENSITY_ICONS[o.id] }))}
                      value={intensity}
                      onChange={(v) => setIntensity(v as StudyIntensity)}
                      onConfirm={goNext}
                      columns
                    />
                  )}
                  {step === 'plan' && plan && level && intensity && (
                    <PlanStep plan={plan} schools={selectedSchools} levelLabel={answers.level!} intensityLabel={answers.intensity!} />
                  )}
                </div>
              </motion.section>
            </AnimatePresence>

            {/* Desktop actions sit under the step; phones get a fixed bar at the bottom. */}
            <div className="mt-10 hidden items-center justify-between gap-3 lg:flex">
              <Button variant="ghost" onClick={() => go(stepIndex - 1)} className={cn('min-h-12 gap-2 rounded-full', stepIndex === 0 && 'invisible')}>
                <ArrowLeft className="h-4 w-4" aria-hidden /> Back
              </Button>
              <div className="flex items-center gap-3">{skipSchools}{primary}</div>
            </div>
          </div>
        </main>

        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border/60 bg-background/95 px-5 pb-[max(16px,env(safe-area-inset-bottom))] pt-3 backdrop-blur lg:hidden">
          <div className="mx-auto flex max-w-xl flex-col gap-1">
            {primary}
            {skipSchools && <div className="flex justify-center">{skipSchools}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

function NameStep({ name, onChange, onEnter }: { name: string; onChange: (v: string) => void; onEnter: () => void }) {
  return (
    <div>
      <label htmlFor="onboarding-name" className="sr-only">Your first name</label>
      <Input
        id="onboarding-name"
        autoFocus
        autoComplete="given-name"
        maxLength={60}
        value={name}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') onEnter(); }}
        placeholder="First name"
        className="h-14 rounded-2xl px-5 text-lg"
      />
    </div>
  );
}

function SchoolsStep({ schools, selected, onChange }: { schools: SchoolEntry[]; selected: SchoolEntry[]; onChange: (s: SchoolEntry[]) => void }) {
  const [query, setQuery] = useState('');
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return schools
      .filter((s) => !selected.some((sel) => sel.name === s.name))
      .filter((s) => s.name.toLowerCase().includes(q) || s.region?.toLowerCase().includes(q))
      .slice(0, 6);
  }, [schools, query, selected]);
  const add = (s: SchoolEntry) => { onChange([...selected, s]); setQuery(''); };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <label htmlFor="onboarding-school" className="sr-only">Search for a school</label>
        <Input
          id="onboarding-school"
          autoFocus
          role="combobox"
          aria-expanded={matches.length > 0}
          aria-controls="onboarding-school-results"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && matches[0]) { e.preventDefault(); add(matches[0]); } }}
          placeholder="Search by school name or town"
          className="h-14 rounded-2xl pl-11 text-base"
        />
      </div>
      {query.trim() && (
        <ul id="onboarding-school-results" role="listbox" aria-label="Matching schools" className="overflow-hidden rounded-2xl border border-border bg-card">
          {matches.map((s) => (
            <li key={s.name} role="option" aria-selected={false}>
              <button type="button" onClick={() => add(s)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-muted">
                <span className="text-sm font-semibold">{s.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{s.region}</span>
              </button>
            </li>
          ))}
          {!matches.length && <li className="px-4 py-3 text-sm text-muted-foreground">No match yet. Try the town, or skip this for now.</li>}
        </ul>
      )}
      {selected.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label="Your schools">
          {selected.map((s) => (
            <li key={s.name} className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 py-1.5 pl-3.5 pr-1.5 text-sm font-semibold text-primary">
              {s.name}
              <button type="button" onClick={() => onChange(selected.filter((x) => x.name !== s.name))} aria-label={`Remove ${s.name}`}
                className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-primary/20">
                <X className="h-3.5 w-3.5" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ChoiceList({
  label, options, value, onChange, onConfirm, columns = false,
}: {
  label: string;
  options: { id: string; label: string; detail: string; icon: LucideIcon }[];
  value: string | null;
  onChange: (id: string) => void;
  onConfirm: () => void;
  columns?: boolean;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cn('grid gap-3', columns && 'sm:grid-cols-3')}>
      {options.map((o) => {
        const active = value === o.id;
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.id)}
            onDoubleClick={() => { onChange(o.id); onConfirm(); }}
            className={cn(
              'group flex items-center gap-4 rounded-2xl border-2 p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              columns && 'sm:flex-col sm:items-start sm:gap-3',
              active ? 'border-primary bg-primary/[0.07]' : 'border-border hover:border-primary/40 hover:bg-muted/40',
            )}
          >
            <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors', active ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground')}>
              <o.icon className="h-5 w-5" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">{o.label}</span>
              <span className="mt-0.5 block text-sm text-muted-foreground">{o.detail}</span>
            </span>
            <span className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors', columns && 'sm:hidden',
              active ? 'border-primary bg-primary text-primary-foreground' : 'border-border')} aria-hidden>
              {active && <Check className="h-3.5 w-3.5" />}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function PlanStep({ plan, schools, levelLabel, intensityLabel }: {
  plan: NonNullable<ReturnType<typeof buildMiniPlan>>;
  schools: SchoolEntry[];
  levelLabel: string;
  intensityLabel: string;
}) {
  return (
    <div className="space-y-4">
      <ul className="flex flex-wrap gap-2" aria-label="Your answers">
        {[levelLabel, `${intensityLabel} · ${plan.sessionsPerWeek} sessions a week`, schools.length ? `${schools.length} school${schools.length === 1 ? '' : 's'}` : 'Schools to add later']
          .map((t) => <li key={t} className="rounded-full bg-muted px-3 py-1 text-xs font-semibold">{t}</li>)}
      </ul>
      <Panel title="Your week">
        <ol className="grid grid-cols-7 gap-1.5" aria-label="Suggested practice days">
          {DAYS.map((d, i) => {
            const on = plan.suggestedDays.includes(i);
            return (
              <li key={d} className={cn('flex flex-col items-center gap-1 rounded-xl py-2 text-xs font-semibold', on ? 'bg-primary text-primary-foreground' : 'bg-muted/60 text-muted-foreground')}>
                {d}
                <span className={cn('h-1.5 w-1.5 rounded-full', on ? 'bg-primary-foreground' : 'bg-transparent')} aria-hidden />
                <span className="sr-only">{on ? 'practice day' : 'rest day'}</span>
              </li>
            );
          })}
        </ol>
      </Panel>
      <Panel title="Focus first">
        <ol className="space-y-2">
          {plan.focusOrder.map((item, i) => (
            <li key={item} className="flex items-center gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{i + 1}</span>
              <span className="text-sm font-medium">{item}</span>
            </li>
          ))}
        </ol>
      </Panel>
      <p className="flex items-start gap-3 rounded-2xl bg-primary/[0.07] p-4 text-sm">
        <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
        <span>{plan.tip}</span>
      </p>
      {plan.schoolNote && (
        <p className="rounded-2xl border border-border p-4 text-sm">
          <span className="font-semibold">{plan.schoolNote.schoolName}: </span>
          <span className="text-muted-foreground">{plan.schoolNote.note}</span>
        </p>
      )}
    </div>
  );
}
