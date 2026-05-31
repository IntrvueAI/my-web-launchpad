import {
  MinigameCategory,
  MinigameQuestion,
  MinigameResult,
  MinigameSubject,
  RawNonVerbalQuestion,
  RawQuestion,
  RawTextQuestion,
} from '@/models/Minigame';

import maRaw from '@/data/minigames/ma_questions.json';
import vrRaw from '@/data/minigames/vr_questions.json';
import enRaw from '@/data/minigames/en_questions.json';
import nvRaw from '@/data/minigames/nv_questions.json';

const SOURCES: Record<MinigameSubject, RawQuestion[]> = {
  Maths: maRaw as RawTextQuestion[],
  'Verbal reasoning': vrRaw as RawTextQuestion[],
  'English comprehension': enRaw as RawTextQuestion[],
  'Non-verbal reasoning': nvRaw as RawNonVerbalQuestion[],
};

/**
 * Practice categories. "Logic" groups the reasoning subjects; Maths and
 * English stand alone. Add categories/subjects here as more data lands.
 */
const CATEGORIES: MinigameCategory[] = [
  {
    id: 'maths',
    label: 'Maths',
    description: 'Number, arithmetic and problem solving',
    subjects: ['Maths'],
  },
  {
    id: 'logic',
    label: 'Logic & Reasoning',
    description: 'Verbal and non-verbal reasoning',
    subjects: ['Verbal reasoning', 'Non-verbal reasoning'],
  },
  {
    id: 'english',
    label: 'English',
    description: 'Reading comprehension',
    subjects: ['English comprehension'],
  },
];

function isNonVerbal(q: RawQuestion): q is RawNonVerbalQuestion {
  return (q as RawNonVerbalQuestion).option_svgs !== undefined;
}

function normalise(q: RawQuestion): MinigameQuestion {
  if (isNonVerbal(q)) {
    const options = q.option_svgs.map((svg, i) => ({
      label: q.option_labels[i] ?? String.fromCharCode(65 + i),
      svg,
    }));
    return {
      id: q.id,
      subject: q.subject,
      topic: q.topic,
      difficulty: q.difficulty,
      prompt: q.question,
      stimulusSvg: q.stimulus_svg || undefined,
      options,
      correctIndex: Math.max(0, q.option_labels.indexOf(q.answer)),
      explanation: q.explanation,
    };
  }

  const options = q.options.map((text) => ({ label: text, text }));
  return {
    id: q.id,
    subject: q.subject,
    topic: q.topic,
    difficulty: q.difficulty,
    prompt: q.question,
    passageTitle: q.passage_title,
    passage: q.passage,
    options,
    correctIndex: Math.max(0, q.options.indexOf(q.answer)),
    explanation: q.explanation,
  };
}

export const MinigameService = {
  /** Categories that have at least one subject with questions available. */
  getCategories(): MinigameCategory[] {
    return CATEGORIES.map((c) => ({
      ...c,
      subjects: c.subjects.filter((s) => SOURCES[s]?.length > 0),
    })).filter((c) => c.subjects.length > 0);
  },

  /** Subjects that currently have questions available. */
  getSubjects(): MinigameSubject[] {
    return (Object.keys(SOURCES) as MinigameSubject[]).filter(
      (s) => SOURCES[s]?.length > 0
    );
  },

  /**
   * Fetch a set of questions for a subject. Local JSON today;
   * later this becomes a Supabase query with the same signature.
   */
  async getQuestions(
    subject: MinigameSubject,
    limit = 10
  ): Promise<MinigameQuestion[]> {
    const all = (SOURCES[subject] ?? []).map(normalise);
    // simple shuffle so each run differs
    const shuffled = [...all].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, limit);
  },

  /**
   * Persist a completed run. No-op locally; later writes to a
   * `minigame_attempts` table for per-user history (feeds FEAT-02).
   */
  async recordResult(_result: MinigameResult): Promise<void> {
    return;
  },
};
