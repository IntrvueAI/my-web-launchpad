export type MinigameSubject =
  | 'Maths'
  | 'Verbal reasoning'
  | 'Non-verbal reasoning'
  | 'English comprehension';

export type MinigameDifficulty = 'Standard' | 'Challenge' | string;

/**
 * Raw shapes as they appear in src/data/minigames/*.json.
 * Text subjects (maths, verbal) and english share the MCQ shape;
 * english adds passage fields; non-verbal carries SVG markup instead of text options.
 */
export interface RawTextQuestion {
  subject: MinigameSubject;
  topic: string;
  difficulty: MinigameDifficulty;
  question: string;
  options: string[];
  answer: string; // the option *text*
  explanation: string;
  id: string;
  // english-only:
  passage_id?: string;
  passage_title?: string;
  passage?: string;
}

export interface RawNonVerbalQuestion {
  subject: 'Non-verbal reasoning';
  topic: string;
  difficulty: MinigameDifficulty;
  question: string;
  stimulus_svg?: string;
  option_labels: string[];
  option_svgs: string[];
  answer: string; // the option *label*, e.g. "B"
  explanation: string;
  id: string;
}

export type RawQuestion = RawTextQuestion | RawNonVerbalQuestion;

/**
 * Normalised question the UI renders. Every subject collapses to this:
 * a prompt, a list of options (text or SVG), and the index of the correct one.
 */
export interface MinigameOption {
  label: string; // "A"/"B"/... or the option text itself
  text?: string; // present for text-based options
  svg?: string; // present for non-verbal options
}

export interface MinigameQuestion {
  id: string;
  subject: MinigameSubject;
  topic: string;
  difficulty: MinigameDifficulty;
  prompt: string;
  /** Optional shared reading passage (english) or stimulus SVG (non-verbal). */
  passageTitle?: string;
  passage?: string;
  stimulusSvg?: string;
  options: MinigameOption[];
  correctIndex: number;
  explanation: string;
}

/** A practice category groups one or more subjects (e.g. Logic = verbal + non-verbal). */
export interface MinigameCategory {
  id: string;
  label: string;
  description: string;
  subjects: MinigameSubject[];
}

export interface MinigameAttempt {
  questionId: string;
  selectedIndex: number;
  correct: boolean;
  answeredAt: string;
}

export interface MinigameResult {
  subject: MinigameSubject;
  total: number;
  correct: number;
  attempts: MinigameAttempt[];
}
