import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, type Variants } from 'framer-motion';
import Confetti from 'react-confetti';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Flame,
  Leaf,
  PartyPopper,
  RotateCcw,
  Search,
  Sparkles,
  TrendingUp,
  Trophy,
  X,
  Zap,
} from 'lucide-react';
import { Pip } from '@/components/brand/Pip';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  buildMiniPlan,
  INTENSITY_OPTIONS,
  LEVEL_OPTIONS,
  WEEKDAY_LABELS,
  type ExperienceLevel,
  type MiniPlan,
  type SchoolEntry,
  type StudyIntensity,
} from '@/data/onboarding/studyPlan';

/**
 * Redesigned signup onboarding: name → schools → experience level → study intensity → a generated
 * mini plan. Standalone and self-contained (no Supabase writes) so it can be reviewed as a preview
 * before it replaces the free-text `PostSignupForm.tsx` dialog in the real signup path.
 */

type Step = 'name' | 'schools' | 'level' | 'intensity' | 'plan';
const STEPS: Step[] = ['name', 'schools', 'level', 'intensity', 'plan'];

const PIP_LINES: Record<Step, (name: string) => string> = {
  name: () => "Hi, I'm Pip! 🦉 What should I call you?",
  schools: (name) => `Nice to meet you${name ? `, ${name}` : ''}! Which schools are you working towards?`,
  level: (name) => `Got it${name ? `, ${name}` : ''}. How much interview practice have you had so far?`,
  intensity: () => 'Perfect. How hard do you want to train?',
  plan: (name) => `You're all set${name ? `, ${name}` : ''}! Here's your plan.`,
};

const LEVEL_ICONS: Record<ExperienceLevel, LucideIcon> = {
  'new': Sparkles,
  'some-practice': TrendingUp,
  'almost-ready': Trophy,
};

const INTENSITY_ICONS: Record<StudyIntensity, LucideIcon> = {
  light: Leaf,
  steady: Zap,
  intense: Flame,
};

function useSchoolsData() {
  const [schools, setSchools] = useState<SchoolEntry[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/data/uk-schools-master-list.json');
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && Array.isArray(data)) setSchools(data);
      } catch {
        // Search just comes back empty — not fatal for a preview flow.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return schools;
}

const slideVariants: Variants = {
  enter: (dir: number) => ({ x: dir > 0 ? 32 : -32, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -32 : 32, opacity: 0 }),
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
};

export function OnboardingFlowPreview() {
  const [stepIndex, setStepIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [name, setName] = useState('');
  const [selectedSchools, setSelectedSchools] = useState<SchoolEntry[]>([]);
  const [level, setLevel] = useState<ExperienceLevel | null>(null);
  const [intensity, setIntensity] = useState<StudyIntensity | null>(null);

  const step = STEPS[stepIndex];
  const schools = useSchoolsData();

  const canContinue =
    step === 'name' ? name.trim().length > 0 :
    step === 'level' ? level !== null :
    step === 'intensity' ? intensity !== null :
    true;

  const goNext = () => {
    if (!canContinue) return;
    setDirection(1);
    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  };
  const goBack = () => {
    setDirection(-1);
    setStepIndex((i) => Math.max(i - 1, 0));
  };
  const restart = () => {
    setDirection(-1);
    setStepIndex(0);
    setName('');
    setSelectedSchools([]);
    setLevel(null);
    setIntensity(null);
  };

  const plan = useMemo(() => {
    if (!level || !intensity) return null;
    return buildMiniPlan(level, intensity, selectedSchools);
  }, [level, intensity, selectedSchools]);

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center px-4 py-10">
      {/* Ambient blobs — same treatment as LandingHero */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-16 left-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-10 right-12 w-56 h-56 bg-sky/10 rounded-full blur-3xl animate-pulse [animation-delay:700ms]" />
        <div className="absolute top-1/2 right-1/4 w-24 h-24 bg-purple/10 rounded-full blur-2xl animate-pulse [animation-delay:1200ms]" />
      </div>

      {step === 'plan' && <PlanConfetti />}

      <div className="relative z-10 w-full max-w-xl">
        {/* Pip + speech bubble */}
        <div className="flex items-end gap-3 mb-5 px-2">
          <Pip size={56} float />
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
              className="relative bg-card border border-border rounded-2xl rounded-bl-sm px-4 py-2.5 shadow-sm max-w-[320px]"
            >
              <p className="text-sm font-medium text-foreground leading-snug">{PIP_LINES[step](name)}</p>
            </motion.div>
          </AnimatePresence>
        </div>

        <StepProgress current={stepIndex} total={STEPS.length} />

        <div className="mt-5 rounded-[28px] border border-border bg-card shadow-xl p-6 sm:p-8 min-h-[440px] flex flex-col">
          <div className="flex-1 overflow-hidden relative">
            <AnimatePresence mode="wait" custom={direction} initial={false}>
              <motion.div
                key={step}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.28, ease: 'easeOut' }}
              >
                {step === 'name' && <NameStep name={name} onChange={setName} onEnter={goNext} />}
                {step === 'schools' && (
                  <SchoolsStep schools={schools} selected={selectedSchools} onChange={setSelectedSchools} />
                )}
                {step === 'level' && <LevelStep value={level} onChange={setLevel} />}
                {step === 'intensity' && <IntensityStep value={intensity} onChange={setIntensity} />}
                {step === 'plan' && plan && (
                  <PlanStep name={name} schools={selectedSchools} level={level!} intensity={intensity!} plan={plan} />
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="flex items-center justify-between pt-6 mt-2 border-t border-border/60">
            <Button
              variant="ghost"
              onClick={goBack}
              disabled={stepIndex === 0}
              className={cn('gap-1.5', stepIndex === 0 && 'invisible')}
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            {step === 'plan' ? (
              <Button onClick={restart} variant="outline" className="gap-1.5 rounded-full font-semibold">
                <RotateCcw className="h-4 w-4" /> Preview again
              </Button>
            ) : (
              <Button onClick={goNext} disabled={!canContinue} className="gap-1.5 rounded-full font-semibold px-6">
                {step === 'schools' && selectedSchools.length === 0 ? "I'm not sure yet" : 'Continue'}
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StepProgress({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex gap-1.5 px-2">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="h-1.5 flex-1 rounded-full bg-secondary overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-primary"
            initial={{ width: '0%' }}
            animate={{ width: i <= current ? '100%' : '0%' }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
        </div>
      ))}
    </div>
  );
}

function NameStep({ name, onChange, onEnter }: { name: string; onChange: (v: string) => void; onEnter: () => void }) {
  return (
    <div className="flex flex-col justify-center h-full py-8">
      <h2 className="font-display text-2xl sm:text-3xl font-semibold text-foreground mb-2">What's your name?</h2>
      <p className="text-muted-foreground mb-6">So Pip knows what to cheer for.</p>
      <Input
        autoFocus
        value={name}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onEnter();
        }}
        placeholder="e.g. Amelia"
        className="h-14 text-lg rounded-2xl px-5"
      />
    </div>
  );
}

function SchoolsStep({
  schools,
  selected,
  onChange,
}: {
  schools: SchoolEntry[];
  selected: SchoolEntry[];
  onChange: (schools: SchoolEntry[]) => void;
}) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return schools
      .filter((s) => !selected.some((sel) => sel.name === s.name))
      .filter((s) => s.name.toLowerCase().includes(q) || s.region?.toLowerCase().includes(q))
      .slice(0, 6);
  }, [schools, query, selected]);

  const addSchool = (s: SchoolEntry) => {
    onChange([...selected, s]);
    setQuery('');
  };
  const removeSchool = (name: string) => {
    onChange(selected.filter((s) => s.name !== name));
  };

  return (
    <div className="h-full py-2">
      <h2 className="font-display text-2xl sm:text-3xl font-semibold text-foreground mb-2">Which schools?</h2>
      <p className="text-muted-foreground mb-5">Pick as many as you like — you can always change this later.</p>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && filtered[0]) addSchool(filtered[0]);
          }}
          placeholder="Search by school name or region…"
          className="h-12 rounded-2xl pl-10"
        />
        <AnimatePresence>
          {filtered.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
              className="absolute z-20 mt-2 w-full rounded-2xl border border-border bg-card shadow-lg overflow-hidden"
            >
              {filtered.map((s) => (
                <button
                  key={s.name}
                  type="button"
                  onClick={() => addSchool(s)}
                  className="w-full text-left px-4 py-2.5 hover:bg-muted transition-colors flex items-center justify-between gap-2"
                >
                  <span className="text-sm font-medium">{s.name}</span>
                  <span className="text-xs text-muted-foreground shrink-0">{s.region}</span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex flex-wrap gap-2 mt-4 min-h-[36px]">
        <AnimatePresence>
          {selected.map((s) => (
            <motion.span
              key={s.name}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.15 }}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary border border-primary/20 pl-3.5 pr-2 py-1.5 text-sm font-semibold"
            >
              {s.name}
              <button
                type="button"
                onClick={() => removeSchool(s.name)}
                className="rounded-full p-0.5 hover:bg-primary/20 transition-colors"
                aria-label={`Remove ${s.name}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </motion.span>
          ))}
        </AnimatePresence>
        {selected.length === 0 && (
          <p className="text-sm text-muted-foreground italic">
            No schools added yet — that's OK, search above or skip for now.
          </p>
        )}
      </div>
    </div>
  );
}

function LevelStep({ value, onChange }: { value: ExperienceLevel | null; onChange: (v: ExperienceLevel) => void }) {
  return (
    <div className="h-full py-2">
      <h2 className="font-display text-2xl sm:text-3xl font-semibold text-foreground mb-2">
        Where are you starting from?
      </h2>
      <p className="text-muted-foreground mb-5">Be honest — Pip won't judge.</p>
      <div className="space-y-3">
        {LEVEL_OPTIONS.map((opt) => {
          const Icon = LEVEL_ICONS[opt.id];
          const active = value === opt.id;
          return (
            <motion.button
              key={opt.id}
              type="button"
              onClick={() => onChange(opt.id)}
              whileTap={{ scale: 0.98 }}
              className={cn(
                'w-full flex items-center gap-4 rounded-2xl border-2 px-4 py-3.5 text-left transition-colors',
                active ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40 hover:bg-muted/50',
              )}
            >
              <div
                className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
                  active ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground',
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-foreground">{opt.label}</div>
                <div className="text-sm text-muted-foreground">{opt.blurb}</div>
              </div>
              <AnimatePresence>
                {active && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="shrink-0 h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

function IntensityStep({ value, onChange }: { value: StudyIntensity | null; onChange: (v: StudyIntensity) => void }) {
  return (
    <div className="h-full py-2">
      <h2 className="font-display text-2xl sm:text-3xl font-semibold text-foreground mb-2">
        How hard do you want to train?
      </h2>
      <p className="text-muted-foreground mb-5">You can always change your pace later.</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {INTENSITY_OPTIONS.map((opt) => {
          const Icon = INTENSITY_ICONS[opt.id];
          const active = value === opt.id;
          return (
            <motion.button
              key={opt.id}
              type="button"
              onClick={() => onChange(opt.id)}
              whileTap={{ scale: 0.97 }}
              whileHover={{ y: -2 }}
              className={cn(
                'flex flex-col items-center text-center gap-2 rounded-2xl border-2 px-4 py-5 transition-colors',
                active ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40 hover:bg-muted/50',
              )}
            >
              <div
                className={cn(
                  'flex h-11 w-11 items-center justify-center rounded-full',
                  active ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground',
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div className="font-semibold text-foreground">{opt.label}</div>
              <div className="text-xs text-muted-foreground">{opt.blurb}</div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

function PlanStep({
  name,
  schools,
  level,
  intensity,
  plan,
}: {
  name: string;
  schools: SchoolEntry[];
  level: ExperienceLevel;
  intensity: StudyIntensity;
  plan: MiniPlan;
}) {
  const levelLabel = LEVEL_OPTIONS.find((o) => o.id === level)?.label;
  const intensityLabel = INTENSITY_OPTIONS.find((o) => o.id === intensity)?.label;

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}
      className="h-full py-1"
    >
      <motion.h2 variants={fadeUp} className="font-display text-2xl sm:text-3xl font-semibold text-foreground mb-1">
        {name ? `Nice one, ${name}!` : 'Nice one!'}
      </motion.h2>
      <motion.p variants={fadeUp} className="text-muted-foreground mb-5">
        Here's a starter plan built around how you answered.
      </motion.p>

      <motion.div variants={fadeUp} className="flex flex-wrap gap-2 mb-5">
        <RecapChip label={levelLabel} />
        <RecapChip label={`${intensityLabel} · ${plan.sessionsPerWeek}/week`} />
        <RecapChip label={schools.length ? `${schools.length} school${schools.length > 1 ? 's' : ''}` : 'Schools TBD'} />
      </motion.div>

      <motion.div variants={fadeUp} className="rounded-2xl border border-border bg-muted/40 p-4 mb-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Your week</div>
        <div className="flex justify-between">
          {WEEKDAY_LABELS.map((d, i) => (
            <div
              key={i}
              className={cn(
                'h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold',
                plan.suggestedDays.includes(i)
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground/60',
              )}
            >
              {d}
            </div>
          ))}
        </div>
      </motion.div>

      <motion.div variants={fadeUp} className="space-y-2 mb-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Your focus order</div>
        {plan.focusOrder.map((item, i) => (
          <div key={item} className="flex items-center gap-3 rounded-xl bg-card border border-border px-3 py-2.5">
            <div className="h-6 w-6 shrink-0 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
              {i + 1}
            </div>
            <div className="text-sm font-medium text-foreground">{item}</div>
          </div>
        ))}
      </motion.div>

      <motion.p variants={fadeUp} className="text-sm text-muted-foreground italic mb-2">
        {plan.tip}
      </motion.p>

      {plan.schoolNote && (
        <motion.div
          variants={fadeUp}
          className="flex items-start gap-2.5 rounded-xl bg-amber/10 border border-amber/20 px-3.5 py-3 text-sm"
        >
          <PartyPopper className="h-4 w-4 text-amber shrink-0 mt-0.5" />
          <span>
            <span className="font-semibold">{plan.schoolNote.schoolName}: </span>
            {plan.schoolNote.note}
          </span>
        </motion.div>
      )}
    </motion.div>
  );
}

function RecapChip({ label }: { label?: string }) {
  if (!label) return null;
  return <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">{label}</span>;
}

function PlanConfetti() {
  const [size, setSize] = useState({ width: window.innerWidth, height: window.innerHeight });

  useEffect(() => {
    const onResize = () => setSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return (
    <Confetti
      width={size.width}
      height={size.height}
      recycle={false}
      numberOfPieces={260}
      colors={['#FF7F50', '#FBBF24', '#38BDF8', '#34D399', '#8B5CF6']}
      style={{ zIndex: 50 }}
    />
  );
}
