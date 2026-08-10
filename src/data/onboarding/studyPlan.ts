/**
 * Pure logic for the onboarding "mini plan" step — no UI, no fetching. Kept separate from
 * OnboardingFlowPreview.tsx so the plan-building rules can be unit tested or reused once this
 * flow graduates from the temp preview into the real signup path.
 */

export type ExperienceLevel = 'new' | 'some-practice' | 'almost-ready';
export type StudyIntensity = 'light' | 'steady' | 'intense';

export interface SchoolEntry {
  name: string;
  website?: string;
  region?: string;
  type?: string;
  gender?: string;
  notes?: string;
}

export interface LevelOption {
  id: ExperienceLevel;
  label: string;
  blurb: string;
}

export interface IntensityOption {
  id: StudyIntensity;
  label: string;
  blurb: string;
  sessionsPerWeek: number;
  /** 0 = Mon .. 6 = Sun, used to plot the "your week" dots on the plan step. */
  suggestedDays: number[];
}

export const LEVEL_OPTIONS: LevelOption[] = [
  {
    id: 'new',
    label: 'Just starting out',
    blurb: "Never done a practice interview before — let's ease in gently.",
  },
  {
    id: 'some-practice',
    label: 'Had a bit of practice',
    blurb: 'Comfortable with the basics, ready to sharpen up.',
  },
  {
    id: 'almost-ready',
    label: 'Almost interview-ready',
    blurb: "Done a few mocks already — now it's about polish and pace.",
  },
];

export const INTENSITY_OPTIONS: IntensityOption[] = [
  {
    id: 'light',
    label: 'Light',
    blurb: '1–2 sessions a week',
    sessionsPerWeek: 2,
    suggestedDays: [0, 3],
  },
  {
    id: 'steady',
    label: 'Steady',
    blurb: '3–4 sessions a week',
    sessionsPerWeek: 3,
    suggestedDays: [0, 2, 4],
  },
  {
    id: 'intense',
    label: 'Intense',
    blurb: '5+ sessions a week — interview coming up fast',
    sessionsPerWeek: 5,
    suggestedDays: [0, 1, 2, 3, 4],
  },
];

const FOCUS_ORDER: Record<ExperienceLevel, string[]> = {
  'new': [
    'Warm-up chat & telling your story',
    'School & interests questions',
    'Easy logic puzzles',
  ],
  'some-practice': [
    'Logic & problem-solving',
    'Maths under pressure',
    'Current affairs basics',
  ],
  'almost-ready': [
    'Full timed mock interviews',
    'Current affairs deep-dives',
    'Tricky follow-up questions',
  ],
};

const TIP: Record<ExperienceLevel, string> = {
  'new': 'Start with a friendly warm-up mock this week — no pressure, just practice.',
  'some-practice': 'Book a timed mock every session so pacing becomes second nature.',
  'almost-ready': 'Mix in full-length mocks with follow-up questions to simulate the real thing.',
};

export interface MiniPlan {
  sessionsPerWeek: number;
  suggestedDays: number[];
  focusOrder: string[];
  tip: string;
  schoolNote: { schoolName: string; note: string } | null;
}

export function buildMiniPlan(
  level: ExperienceLevel,
  intensity: StudyIntensity,
  schools: SchoolEntry[],
): MiniPlan {
  const intensityOption = INTENSITY_OPTIONS.find((o) => o.id === intensity) ?? INTENSITY_OPTIONS[1];
  const schoolWithNote = schools.find((s) => !!s.notes?.trim());

  return {
    sessionsPerWeek: intensityOption.sessionsPerWeek,
    suggestedDays: intensityOption.suggestedDays,
    focusOrder: FOCUS_ORDER[level],
    tip: TIP[level],
    schoolNote: schoolWithNote ? { schoolName: schoolWithNote.name, note: schoolWithNote.notes! } : null,
  };
}

export const WEEKDAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
