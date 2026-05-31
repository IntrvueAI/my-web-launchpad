import { useEffect, useState } from 'react';
import { MinigameService } from '@/services/MinigameService';
import {
  MinigameAttempt,
  MinigameCategory,
  MinigameOption,
  MinigameQuestion,
  MinigameSubject,
} from '@/models/Minigame';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { ArrowLeft, Check, X } from 'lucide-react';

const QUESTIONS_PER_ROUND = 10;

type Phase = 'category' | 'subject' | 'playing' | 'results';

/** Renders one option: SVG for non-verbal, text otherwise. */
function OptionContent({ option }: { option: MinigameOption }) {
  if (option.svg) {
    return (
      <div className="flex flex-col items-center gap-2">
        <span className="text-sm font-semibold text-muted-foreground">
          {option.label}
        </span>
        <div
          className="[&>svg]:h-24 [&>svg]:w-24"
          // SVG comes from our own bundled question data, not user input.
          dangerouslySetInnerHTML={{ __html: option.svg }}
        />
      </div>
    );
  }
  return <span className="text-left">{option.text}</span>;
}

/**
 * Self-contained practice section embedded in the Practice view.
 * Manages its own category → subject → round flow; no routing.
 */
export function MinigameSection() {
  const [phase, setPhase] = useState<Phase>('category');
  const [categories] = useState<MinigameCategory[]>(() =>
    MinigameService.getCategories()
  );
  const [category, setCategory] = useState<MinigameCategory | null>(null);
  const [subject, setSubject] = useState<MinigameSubject | null>(null);
  const [questions, setQuestions] = useState<MinigameQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [attempts, setAttempts] = useState<MinigameAttempt[]>([]);

  const current = questions[index];
  const isAnswered = selected !== null;
  const correctCount = attempts.filter((a) => a.correct).length;

  function pickCategory(cat: MinigameCategory) {
    setCategory(cat);
    if (cat.subjects.length === 1) {
      startRound(cat.subjects[0]);
    } else {
      setPhase('subject');
    }
  }

  async function startRound(subj: MinigameSubject) {
    const qs = await MinigameService.getQuestions(subj, QUESTIONS_PER_ROUND);
    setSubject(subj);
    setQuestions(qs);
    setIndex(0);
    setSelected(null);
    setAttempts([]);
    setPhase('playing');
  }

  /** Return to the subject list (multi-subject categories) or the category grid. */
  function backFromPlay() {
    if (category && category.subjects.length > 1) setPhase('subject');
    else setPhase('category');
  }

  function choose(optionIndex: number) {
    if (isAnswered) return;
    setSelected(optionIndex);
    setAttempts((prev) => [
      ...prev,
      {
        questionId: current.id,
        selectedIndex: optionIndex,
        correct: optionIndex === current.correctIndex,
        answeredAt: new Date().toISOString(),
      },
    ]);
  }

  function next() {
    if (index + 1 >= questions.length) {
      setPhase('results');
      return;
    }
    setIndex((i) => i + 1);
    setSelected(null);
  }

  useEffect(() => {
    if (phase === 'results' && subject) {
      MinigameService.recordResult({
        subject,
        total: questions.length,
        correct: correctCount,
        attempts,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  if (categories.length === 0) return null;

  // ---- CATEGORY SELECT (the section's resting state) ----
  if (phase === 'category') {
    return (
      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold">Practice questions</h2>
          <p className="text-muted-foreground">
            Sharpen up with quick {QUESTIONS_PER_ROUND}-question rounds.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c) => (
            <Card
              key={c.id}
              role="button"
              onClick={() => pickCategory(c)}
              className="cursor-pointer p-5 transition-colors hover:border-primary hover:bg-accent"
            >
              <span className="font-semibold">{c.label}</span>
              <p className="mt-1 text-sm text-muted-foreground">
                {c.description}
              </p>
            </Card>
          ))}
        </div>
      </section>
    );
  }

  // ---- SUBJECT SELECT (multi-subject categories, e.g. Logic) ----
  if (phase === 'subject' && category) {
    return (
      <Frame onBack={() => setPhase('category')}>
        <h2 className="text-2xl font-bold">{category.label}</h2>
        <p className="text-muted-foreground">Pick a type of question.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {category.subjects.map((s) => (
            <Card
              key={s}
              role="button"
              onClick={() => startRound(s)}
              className="cursor-pointer p-5 transition-colors hover:border-primary hover:bg-accent"
            >
              <span className="font-semibold">{s}</span>
            </Card>
          ))}
        </div>
      </Frame>
    );
  }

  // ---- RESULTS ----
  if (phase === 'results') {
    const pct = Math.round((correctCount / questions.length) * 100);
    return (
      <Frame onBack={backFromPlay}>
        <h2 className="text-2xl font-bold">Round complete</h2>
        <Card className="p-6 text-center">
          <p className="text-5xl font-bold text-primary">{pct}%</p>
          <p className="mt-2 text-muted-foreground">
            {correctCount} / {questions.length} correct · {subject}
          </p>
        </Card>
        <div className="flex gap-3">
          <Button onClick={() => subject && startRound(subject)}>
            Play again
          </Button>
          <Button variant="outline" onClick={() => setPhase('category')}>
            Change topic
          </Button>
        </div>
      </Frame>
    );
  }

  // ---- PLAYING ----
  if (!current) return null;
  return (
    <Frame onBack={backFromPlay}>
      <div className="space-y-1">
        <Progress value={((index + 1) / questions.length) * 100} />
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Question {index + 1} of {questions.length}
          </span>
          <span>Score: {correctCount}</span>
        </div>
      </div>

      <Card className="space-y-4 p-6">
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">{current.topic}</Badge>
          <Badge variant="outline">{current.difficulty}</Badge>
        </div>

        {current.passage && (
          <div className="rounded-lg bg-muted/50 p-4 text-sm leading-relaxed">
            {current.passageTitle && (
              <p className="mb-2 font-semibold">{current.passageTitle}</p>
            )}
            {current.passage.split('\n').map((para, i) => (
              <p key={i} className="mb-2 last:mb-0">
                {para}
              </p>
            ))}
          </div>
        )}

        {current.stimulusSvg && (
          <div
            className="flex justify-center [&>svg]:h-32 [&>svg]:w-32"
            dangerouslySetInnerHTML={{ __html: current.stimulusSvg }}
          />
        )}

        <p className="text-lg font-medium">{current.prompt}</p>

        <div
          className={cn(
            'grid gap-3',
            current.options.some((o) => o.svg) ? 'grid-cols-2' : 'grid-cols-1'
          )}
        >
          {current.options.map((opt, i) => {
            const isCorrect = i === current.correctIndex;
            const isPicked = i === selected;
            return (
              <button
                key={i}
                disabled={isAnswered}
                onClick={() => choose(i)}
                className={cn(
                  'flex items-center justify-between gap-3 rounded-lg border p-4 text-left transition-colors',
                  !isAnswered && 'hover:border-primary hover:bg-accent',
                  isAnswered && isCorrect && 'border-green-500 bg-green-500/10',
                  isAnswered &&
                    isPicked &&
                    !isCorrect &&
                    'border-red-500 bg-red-500/10',
                  isAnswered && !isCorrect && !isPicked && 'opacity-60'
                )}
              >
                <OptionContent option={opt} />
                {isAnswered && isCorrect && (
                  <Check className="h-5 w-5 shrink-0 text-green-600" />
                )}
                {isAnswered && isPicked && !isCorrect && (
                  <X className="h-5 w-5 shrink-0 text-red-600" />
                )}
              </button>
            );
          })}
        </div>

        {isAnswered && (
          <div className="space-y-3 rounded-lg bg-muted/50 p-4">
            <p className="text-sm">
              <span className="font-semibold">
                {selected === current.correctIndex ? 'Correct! ' : 'Not quite. '}
              </span>
              {current.explanation}
            </p>
            <Button onClick={next} className="w-full">
              {index + 1 >= questions.length ? 'See results' : 'Next question'}
            </Button>
          </div>
        )}
      </Card>
    </Frame>
  );
}

function Frame({
  children,
  onBack,
}: {
  children: React.ReactNode;
  onBack: () => void;
}) {
  return (
    <section className="mx-auto max-w-2xl space-y-6">
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>
      {children}
    </section>
  );
}
