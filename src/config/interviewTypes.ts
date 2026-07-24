/**
 * Interview Type Configurations
 * 
 * This file defines all the interview types supported by the platform.
 * Each configuration includes scoring systems, sections, and performance bands.
 * 
 * Extended from the original interviewTypes.ts to include more detailed
 * configuration for feedback and scoring systems.
 */

import { InterviewTypeConfig, InterviewType as ModernInterviewType } from '@/types/interview';

// Keep the original interface for backward compatibility
export interface InterviewType {
  id: string;
  name: string;
  description: string;
  category: 'academic' | 'logic' | 'behaviour' | 'maths' | 'school_specific' | 'other' | 'free';
  promptFile: string;
  duration: number; // in minutes
  scoringSystem: '0-5' | '0-9' | '0-10' | '0-7';
  scoringCriteria: string[];
  difficultyLevel: 1 | 2 | 3;
  tags: string[];
  icon: string; // Lucide icon name
  costCredits?: number; // Number of credits required (default 1). 0 for free/demo.
  /**
   * When true, this interview is run by our own server-side "interview brain"
   * (supabase/functions/interview-brain) which drives the Anam avatar via talk() one turn at a
   * time, instead of Anam's bundled LLM running the whole conversation from a static prompt.
   * Pilot: maths-interview only.
   */
  engineDriven?: boolean;
  /** Engine subject id for engine-driven types (matches src/interview/subjects). */
  engineSubject?: string;
  /**
   * Optional reassuring note shown on the setup screen before the interview starts.
   * Paragraphs separated by a blank line; the final paragraph is emphasised.
   */
  preStartNote?: string;
  /**
   * Which video/avatar platform runs this interview. Defaults to 'anam' (the existing
   * useInterviewSession/InterviewPlatform path). 'tavus' interviews are rendered by
   * TavusInterviewPlatform instead — a different SDK (Daily, not Anam) with its own
   * conversation-creation and scoring plumbing (supabase/functions/tavus-*).
   */
  provider?: 'anam' | 'tavus';
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
    icon: 'GraduationCap',
    engineDriven: true,
    engineSubject: 'elevenplus',
    preStartNote:
      "This is the main whole-child interview — like the real thing at a top independent school.\n\n" +
      "Clara will move between getting to know you, how you think, what you love, and how you see the world. " +
      "There are no perfect answers — just be honest, think out loud, and take your time.\n\n" +
      "Ready when you are."
  },
  'logic-puzzles': {
    id: 'logic-puzzles',
    name: '11+ Logic Puzzles',
    description: 'Focused practice on logic puzzles and reasoning problems for 11+ preparation',
    category: 'logic',
    promptFile: 'academic/logic-puzzles.md',
    duration: 30,
    scoringSystem: '0-5',
    scoringCriteria: [
      'Logic',
      'Verbal Reasoning',
      'Thinking Aloud & Adaptability',
      'Lateral Thinking'
    ],
    difficultyLevel: 3,
    tags: ['11+', 'logic puzzles', 'reasoning', 'mathematics', 'patterns'],
    icon: 'Brain',
    engineDriven: true,
    engineSubject: 'logic',
    preStartNote:
      "These questions are deliberately difficult — some have no right answer, and that's intentional.\n\n" +
      "Top schools aren't testing whether you know the answer. They're watching how you think: do you reason aloud, ask good questions, and stay curious when things get tricky?\n\n" +
      "Don't worry about being right. Just focus on showing your thinking."
  },
  'maths-interview': {
    id: 'maths-interview',
    name: '11+ Maths Mock Interview',
    description: 'A spoken maths mock interview with Clara — talk through your method on 10 questions',
    category: 'maths',
    promptFile: 'academic/maths-interview.md',
    duration: 20,
    scoringSystem: '0-5',
    scoringCriteria: [
      'Number & Calculation',
      'Problem-Solving & Method',
      'Mathematical Reasoning',
      'Clarity of Explanation'
    ],
    difficultyLevel: 2,
    tags: ['11+', 'maths', 'mock interview', 'word problems', 'reasoning'],
    icon: 'Calculator',
    engineDriven: true,
    engineSubject: 'maths'
  },
  'maths-v2': {
    id: 'maths-v2',
    name: '11+ Maths Mock Interview (V2)',
    description: 'A spoken maths mock interview with Clara, running on our new video platform — talk through your method on real 11+ questions',
    category: 'maths',
    promptFile: 'academic/maths-interview.md',
    duration: 20,
    scoringSystem: '0-5',
    scoringCriteria: [
      'Number & Calculation',
      'Problem-Solving & Method',
      'Mathematical Reasoning',
      'Clarity of Explanation'
    ],
    difficultyLevel: 2,
    tags: ['11+', 'maths', 'mock interview', 'word problems', 'reasoning', 'beta'],
    icon: 'Calculator',
    provider: 'tavus',
    preStartNote:
      "This is a new version of the maths interview, running on our new video platform — you're one of the first to try it.\n\n" +
      "Clara will read out real 11+ questions and talk you through them one at a time. Explain your thinking out loud as you go.\n\n" +
      "Ready when you are."
  },
  'current-affairs-interview': {
    id: 'current-affairs-interview',
    name: '11+ Current Affairs & Moral Reasoning Interview',
    description: 'A spoken discussion interview with Clara on news, ethics and moral dilemmas — there are no right answers',
    category: 'academic',
    promptFile: 'academic/current-affairs-interview.md',
    duration: 20,
    scoringSystem: '0-5',
    scoringCriteria: [
      'World Awareness & Engagement',
      'Forming & Defending a View',
      'Considering Other Perspectives',
      'Moral Maturity & Clarity'
    ],
    difficultyLevel: 3,
    tags: ['11+', 'current affairs', 'moral reasoning', 'ethics', 'discussion'],
    icon: 'Globe',
    engineDriven: true,
    engineSubject: 'currentaffairs',
    preStartNote:
      "There are no right or wrong answers here — it's a discussion.\n\n" +
      "I'll gently push back on whatever you say. That's not because you're wrong; I just love hearing how you think, and it's completely fine to say you're not sure.\n\n" +
      "Just share your honest view and your reasons."
  },
  'demo': {
    id: 'demo',
    name: 'Free Demo Interview',
    description: 'Try a free 2-minute demo interview. Practice the flow and see feedback without using any credits.',
    category: 'free',
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
    name: 'Full Interviews',
    description: 'Complete comprehensive interview practice',
    color: 'blue'
  },
  logic: {
    name: 'Logic',
    description: 'Logic puzzles and reasoning challenges',
    color: 'purple'
  },
  behaviour: {
    name: 'Behaviour',
    description: 'Behavioral and situational interview questions',
    color: 'green'
  },
  maths: {
    name: 'Maths',
    description: 'Mathematical problem-solving interviews',
    color: 'orange'
  },
  school_specific: {
    name: 'School Specific',
    description: 'Interviews tailored for specific schools',
    color: 'red'
  },
  other: {
    name: 'Other',
    description: 'Specialized and unique interview formats',
    color: 'gray'
  },
  free: {
    name: 'Free',
    description: 'Free demo and trial interviews',
    color: 'emerald'
  }
} as const;

/**
 * Enhanced configurations for detailed feedback and scoring
 */
const ELEVEN_PLUS_CONFIG: InterviewTypeConfig = {
  name: '11+',
  description: 'Traditional UK secondary school entrance interview',
  scoringSystem: '0-5',
  maxTotalScore: 20,
  maxSectionScore: 5,
  sections: [
    {
      id: 'personal_insight',
      title: 'Personal Insight & Expression',
      iconName: 'BookOpen',
      description: 'Ability to express personal thoughts and experiences clearly',
      scoreField: 'personal_insight_score',
      feedbackField: 'personal_insight'
    },
    {
      id: 'reasoning',
      title: 'Reasoning & Intellectual Agility',
      iconName: 'Brain',
      description: 'Logical thinking and problem-solving capabilities',
      scoreField: 'reasoning_score',
      feedbackField: 'reasoning'
    },
    {
      id: 'extracurricular',
      title: 'Extracurricular Engagement',
      iconName: 'Activity',
      description: 'Involvement in activities outside academic studies',
      scoreField: 'extracurricular_score',
      feedbackField: 'extracurricular'
    },
    {
      id: 'current_awareness',
      title: 'Current Awareness & Moral Reasoning',
      iconName: 'Globe',
      description: 'Understanding of current events and ethical reasoning',
      scoreField: 'current_awareness_score',
      feedbackField: 'current_awareness'
    }
  ],
  bandThresholds: [
    { minScore: 18, label: 'Outstanding', colorClass: 'bg-emerald-500', description: 'Exceptional performance across all areas' },
    { minScore: 15, label: 'Strong', colorClass: 'bg-green-500', description: 'Very good performance with minor areas for improvement' },
    { minScore: 12, label: 'Good', colorClass: 'bg-blue-500', description: 'Solid performance meeting most expectations' },
    { minScore: 8, label: 'Developing', colorClass: 'bg-yellow-500', description: 'Shows potential but needs focused development' },
    { minScore: 0, label: 'Needs Support', colorClass: 'bg-red-500', description: 'Requires significant support and practice' }
  ]
};

const IELTS_CONFIG: InterviewTypeConfig = {
  name: 'IELTS Speaking',
  description: 'International English Language Testing System speaking assessment',
  scoringSystem: '0-9',
  maxTotalScore: 9,
  maxSectionScore: 9,
  sections: [
    {
      id: 'fluency_coherence',
      title: 'Fluency & Coherence',
      iconName: 'MessageSquare',
      description: 'Smoothness of speech and logical organization of ideas',
      scoreField: 'fluency_coherence_score',
      feedbackField: 'fluency_coherence'
    },
    {
      id: 'lexical_resource',
      title: 'Lexical Resource',
      iconName: 'Languages',
      description: 'Vocabulary range and appropriate word usage',
      scoreField: 'lexical_resource_score',
      feedbackField: 'lexical_resource'
    },
    {
      id: 'grammatical_range',
      title: 'Grammatical Range & Accuracy',
      iconName: 'FileText',
      description: 'Variety and correctness of grammatical structures',
      scoreField: 'grammatical_range_score',
      feedbackField: 'grammatical_range'
    },
    {
      id: 'pronunciation',
      title: 'Pronunciation',
      iconName: 'Volume2',
      description: 'Clarity and naturalness of speech sounds',
      scoreField: 'pronunciation_score',
      feedbackField: 'pronunciation'
    }
  ],
  bandThresholds: [
    { minScore: 8.5, label: 'Expert User (Band 9)', colorClass: 'bg-emerald-500', description: 'Near-native proficiency' },
    { minScore: 7.5, label: 'Very Good User (Band 8)', colorClass: 'bg-green-500', description: 'Very good command with occasional inaccuracies' },
    { minScore: 6.5, label: 'Good User (Band 7)', colorClass: 'bg-blue-500', description: 'Good operational command despite some inaccuracies' },
    { minScore: 5.5, label: 'Competent User (Band 6)', colorClass: 'bg-yellow-500', description: 'Generally effective command despite inaccuracies' },
    { minScore: 4.5, label: 'Modest User (Band 5)', colorClass: 'bg-orange-500', description: 'Partial command with frequent problems' },
    { minScore: 0, label: 'Below Band 4', colorClass: 'bg-red-500', description: 'Very limited ability with frequent breakdowns' }
  ]
};

// Logic Puzzles Configuration (20 points total: 5+5+5+5)
const LOGIC_PUZZLES_CONFIG: InterviewTypeConfig = {
  name: 'Logic Puzzles Interview',
  description: 'Focused assessment of logical reasoning through voice-based puzzles',
  scoringSystem: '0-5',
  maxTotalScore: 20,
  maxSectionScore: 5,
  sections: [
    {
      id: 'logic',
      title: 'Logic',
      iconName: 'Brain',
      description: 'Following a chain of reasoning to a sound conclusion',
      scoreField: 'pattern_recognition_score',
      feedbackField: 'pattern_recognition'
    },
    {
      id: 'verbal-reasoning',
      title: 'Verbal Reasoning',
      iconName: 'BookOpen',
      description: 'Manipulating language, analogy, and concepts precisely',
      scoreField: 'logical_deduction_score',
      feedbackField: 'logical_deduction'
    },
    {
      id: 'thinking-aloud',
      title: 'Thinking Aloud & Adaptability',
      iconName: 'MessageCircle',
      description: 'Narrating the thought process and adjusting when challenged',
      scoreField: 'mathematical_logic_score',
      feedbackField: 'mathematical_logic'
    },
    {
      id: 'lateral-thinking',
      title: 'Lateral Thinking',
      iconName: 'TrendingUp',
      description: 'Stepping outside the first assumption',
      scoreField: 'clarity_of_thought_score',
      feedbackField: 'clarity_of_thought'
    }
  ],
  bandThresholds: [
    { minScore: 18, label: 'Exceptional', colorClass: 'bg-emerald-500', description: 'Outstanding logical reasoning abilities' },
    { minScore: 15, label: 'Strong', colorClass: 'bg-green-500', description: 'Strong logical thinking skills' },
    { minScore: 12, label: 'Good', colorClass: 'bg-blue-500', description: 'Good reasoning with room for development' },
    { minScore: 8, label: 'Developing', colorClass: 'bg-yellow-500', description: 'Basic reasoning skills, needs practice' },
    { minScore: 0, label: 'Needs Support', colorClass: 'bg-red-500', description: 'Requires significant development in logical reasoning' }
  ]
};

// Maths Mock Interview Configuration (20 points total: 5+5+5+5)
// Reuses the logic-puzzles score fields so no new DB columns are needed,
// but presents maths-appropriate section titles.
const MATHS_INTERVIEW_CONFIG: InterviewTypeConfig = {
  name: 'Maths Mock Interview',
  description: 'Spoken assessment of maths skills and problem-solving with Clara',
  scoringSystem: '0-5',
  maxTotalScore: 20,
  maxSectionScore: 5,
  sections: [
    {
      id: 'number-calculation',
      title: 'Number & Calculation',
      iconName: 'Calculator',
      description: 'Accuracy and fluency with numbers and calculations',
      scoreField: 'pattern_recognition_score',
      feedbackField: 'pattern_recognition'
    },
    {
      id: 'problem-solving',
      title: 'Problem-Solving & Method',
      iconName: 'Brain',
      description: 'Choosing and applying a sound method to reach the answer',
      scoreField: 'logical_deduction_score',
      feedbackField: 'logical_deduction'
    },
    {
      id: 'mathematical-reasoning',
      title: 'Mathematical Reasoning',
      iconName: 'TrendingUp',
      description: 'Reasoning through multi-step and word problems',
      scoreField: 'mathematical_logic_score',
      feedbackField: 'mathematical_logic'
    },
    {
      id: 'clarity-of-explanation',
      title: 'Clarity of Explanation',
      iconName: 'MessageCircle',
      description: 'Explaining the working and reasoning clearly out loud',
      scoreField: 'clarity_of_thought_score',
      feedbackField: 'clarity_of_thought'
    }
  ],
  bandThresholds: [
    { minScore: 18, label: 'Exceptional', colorClass: 'bg-emerald-500', description: 'Outstanding maths skills and explanation' },
    { minScore: 15, label: 'Strong', colorClass: 'bg-green-500', description: 'Strong mathematical thinking' },
    { minScore: 12, label: 'Good', colorClass: 'bg-blue-500', description: 'Good maths with room for development' },
    { minScore: 8, label: 'Developing', colorClass: 'bg-yellow-500', description: 'Basic maths skills, needs practice' },
    { minScore: 0, label: 'Needs Support', colorClass: 'bg-red-500', description: 'Requires significant development in maths' }
  ]
};

// Verbal Reasoning Mock Interview Configuration (20 points total: 5+5+5+5)
// Reuses the logic-puzzles score fields so no new DB columns are needed,
// but presents verbal-reasoning-appropriate section titles.
const VERBAL_INTERVIEW_CONFIG: InterviewTypeConfig = {
  name: 'Verbal Reasoning Mock Interview',
  description: 'Spoken assessment of verbal reasoning and vocabulary with Clara',
  scoringSystem: '0-5',
  maxTotalScore: 20,
  maxSectionScore: 5,
  sections: [
    {
      id: 'vocabulary',
      title: 'Vocabulary & Word Knowledge',
      iconName: 'BookOpen',
      description: 'Range of vocabulary and understanding of word meanings',
      scoreField: 'pattern_recognition_score',
      feedbackField: 'pattern_recognition'
    },
    {
      id: 'verbal-deduction',
      title: 'Verbal Reasoning & Deduction',
      iconName: 'Brain',
      description: 'Reasoning through word-based logic and deduction',
      scoreField: 'logical_deduction_score',
      feedbackField: 'logical_deduction'
    },
    {
      id: 'word-relationships',
      title: 'Word Relationships & Patterns',
      iconName: 'TrendingUp',
      description: 'Spotting analogies, codes, sequences and word patterns',
      scoreField: 'mathematical_logic_score',
      feedbackField: 'mathematical_logic'
    },
    {
      id: 'clarity-of-explanation',
      title: 'Clarity of Explanation',
      iconName: 'MessageCircle',
      description: 'Explaining the reasoning clearly out loud',
      scoreField: 'clarity_of_thought_score',
      feedbackField: 'clarity_of_thought'
    }
  ],
  bandThresholds: [
    { minScore: 18, label: 'Exceptional', colorClass: 'bg-emerald-500', description: 'Outstanding verbal reasoning ability' },
    { minScore: 15, label: 'Strong', colorClass: 'bg-green-500', description: 'Strong verbal reasoning skills' },
    { minScore: 12, label: 'Good', colorClass: 'bg-blue-500', description: 'Good verbal reasoning with room for development' },
    { minScore: 8, label: 'Developing', colorClass: 'bg-yellow-500', description: 'Basic verbal reasoning, needs practice' },
    { minScore: 0, label: 'Needs Support', colorClass: 'bg-red-500', description: 'Requires significant development in verbal reasoning' }
  ]
};

// Current Affairs & Moral Reasoning Interview Configuration (20 points total: 5+5+5+5)
// Reuses the logic-puzzles score fields so no new DB columns are needed,
// but presents current-affairs-appropriate section titles.
const CURRENT_AFFAIRS_INTERVIEW_CONFIG: InterviewTypeConfig = {
  name: 'Current Affairs & Moral Reasoning Interview',
  description: 'Spoken discussion of news, ethics and moral dilemmas with Clara',
  scoringSystem: '0-5',
  maxTotalScore: 20,
  maxSectionScore: 5,
  sections: [
    {
      id: 'world-awareness',
      title: 'World Awareness & Engagement',
      iconName: 'Globe',
      description: 'Genuine awareness of and engagement with the wider world',
      scoreField: 'pattern_recognition_score',
      feedbackField: 'pattern_recognition'
    },
    {
      id: 'forming-defending',
      title: 'Forming & Defending a View',
      iconName: 'Brain',
      description: 'Taking a position and defending it under gentle challenge',
      scoreField: 'logical_deduction_score',
      feedbackField: 'logical_deduction'
    },
    {
      id: 'other-perspectives',
      title: 'Considering Other Perspectives',
      iconName: 'TrendingUp',
      description: 'Acknowledging that reasonable people disagree, and engaging with it',
      scoreField: 'mathematical_logic_score',
      feedbackField: 'mathematical_logic'
    },
    {
      id: 'moral-maturity',
      title: 'Moral Maturity & Clarity',
      iconName: 'MessageCircle',
      description: 'Sitting with hard ethical questions and explaining reasoning clearly',
      scoreField: 'clarity_of_thought_score',
      feedbackField: 'clarity_of_thought'
    }
  ],
  bandThresholds: [
    { minScore: 18, label: 'Exceptional', colorClass: 'bg-emerald-500', description: 'Outstanding awareness and moral reasoning' },
    { minScore: 15, label: 'Strong', colorClass: 'bg-green-500', description: 'Strong reasoning and engagement' },
    { minScore: 12, label: 'Good', colorClass: 'bg-blue-500', description: 'Good engagement with room for development' },
    { minScore: 8, label: 'Developing', colorClass: 'bg-yellow-500', description: 'Developing awareness, needs practice' },
    { minScore: 0, label: 'Needs Support', colorClass: 'bg-red-500', description: 'Requires significant development in awareness and reasoning' }
  ]
};

/**
 * Enhanced configurations mapped by modern interview type
 */
export const INTERVIEW_TYPES_CONFIG: Record<ModernInterviewType, InterviewTypeConfig> = {
  '11-plus': ELEVEN_PLUS_CONFIG,
  'logic-puzzles': LOGIC_PUZZLES_CONFIG,
  'maths-interview': MATHS_INTERVIEW_CONFIG,
  'verbal-interview': VERBAL_INTERVIEW_CONFIG,
  'current-affairs-interview': CURRENT_AFFAIRS_INTERVIEW_CONFIG,
  'ielts': IELTS_CONFIG,
  // Placeholder configurations for future interview types
  'oxbridge': {
    ...ELEVEN_PLUS_CONFIG,
    name: 'Oxbridge',
    description: 'Oxford and Cambridge university entrance interview'
  },
  'grammar-school': {
    ...ELEVEN_PLUS_CONFIG,
    name: 'Grammar School',
    description: 'Grammar school entrance interview'
  },
  'scholarship': {
    ...ELEVEN_PLUS_CONFIG,
    name: 'Scholarship',
    description: 'Academic scholarship interview'
  }
};

// Helper functions (keeping original ones for backward compatibility)
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

/**
 * New enhanced helper functions
 */
export const getInterviewTypeConfig = (type: ModernInterviewType): InterviewTypeConfig => {
  return INTERVIEW_TYPES_CONFIG[type];
};

export const getAllModernInterviewTypes = (): ModernInterviewType[] => {
  return Object.keys(INTERVIEW_TYPES_CONFIG) as ModernInterviewType[];
};

export const isValidInterviewType = (type: string): type is ModernInterviewType => {
  return type in INTERVIEW_TYPES_CONFIG;
};

/** Is this interview run by our own server-side interview brain (vs Anam's bundled LLM)? */
export const isEngineDriven = (id: string): boolean => {
  return Boolean(INTERVIEW_TYPES[id]?.engineDriven);
};