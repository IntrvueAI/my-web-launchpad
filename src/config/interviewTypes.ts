export interface InterviewType {
  id: string;
  name: string;
  description: string;
  category: 'academic' | 'language' | 'professional';
  promptFile: string;
  duration: number; // in minutes
  scoringSystem: '0-5' | '0-9' | '0-10';
  scoringCriteria: string[];
  difficultyLevel: 1 | 2 | 3;
  tags: string[];
  icon: string; // Lucide icon name
  costCredits?: number; // Number of credits required (default 1). 0 for free/demo.
}

export const INTERVIEW_TYPES: Record<string, InterviewType> = {
  '11-plus': {
    id: '11-plus',
    name: '11+ School Interview',
    description: 'Practice interviews for UK 11+ grammar school and independent school admissions',
    category: 'academic',
    promptFile: 'academic/11-plus.md',
    duration: 30,
    scoringSystem: '0-5',
    scoringCriteria: [
      'Personal Insight & Self-Awareness',
      'Reasoning & Problem-Solving', 
      'Extracurricular Activities & Leadership',
      'Current Awareness & Curiosity'
    ],
    difficultyLevel: 2,
    tags: ['school admission', 'academic', 'UK education', 'grammar school', 'independent school'],
    icon: 'GraduationCap'
  },
  'demo': {
    id: 'demo',
    name: 'Free Demo Interview',
    description: 'Try a free 2-minute demo interview. Practice the flow and see feedback without using any credits.',
    category: 'language',
    promptFile: 'demo/demo.md',
    duration: 2,
    scoringSystem: '0-5',
    scoringCriteria: [
      'Communication',
      'Clarity',
      'Confidence',
      'Relevance'
    ],
    difficultyLevel: 1,
    tags: ['demo', 'free', 'quick test', 'trial'],
    icon: 'Timer',
    costCredits: 0
  }
};

export const INTERVIEW_CATEGORIES = {
  academic: {
    name: 'Academic Interviews',
    description: 'School and university admission interviews',
    color: 'blue'
  },
  language: {
    name: 'Language Tests',
    description: 'Language proficiency and speaking tests',
    color: 'green'
  },
  professional: {
    name: 'Professional Interviews',
    description: 'Job interviews and career assessments',
    color: 'purple'
  }
} as const;

// Helper functions
export const getInterviewType = (id: string): InterviewType | undefined => {
  return INTERVIEW_TYPES[id];
};

export const getInterviewTypesByCategory = (category: InterviewType['category']): InterviewType[] => {
  return Object.values(INTERVIEW_TYPES).filter(type => type.category === category);
};

export const getAllInterviewTypes = (): InterviewType[] => {
  return Object.values(INTERVIEW_TYPES);
};

export const getDefaultInterviewType = (): InterviewType => {
  return INTERVIEW_TYPES['11-plus'];
};