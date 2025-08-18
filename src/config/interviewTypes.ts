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
  'logic-puzzles': {
    id: 'logic-puzzles',
    name: '11+ Logic Puzzles',
    description: 'Focused practice on logic puzzles and reasoning problems for 11+ preparation',
    category: 'logic',
    promptFile: 'academic/logic-puzzles.md',
    duration: 30,
    scoringSystem: '0-5',
    scoringCriteria: [
      'Pattern Recognition & Sequences',
      'Logical Deduction & Reasoning',
      'Mathematical Logic & World Problems',
      'Clarity of Thought'
    ],
    difficultyLevel: 3,
    tags: ['11+', 'logic puzzles', 'reasoning', 'mathematics', 'patterns'],
    icon: 'Brain'
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
  name: '11-Plus',
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
      id: 'pattern-recognition',
      title: 'Pattern Recognition & Sequences',
      iconName: 'TrendingUp',
      description: 'Ability to identify patterns and predict sequences',
      scoreField: 'pattern_recognition_score',
      feedbackField: 'pattern_recognition'
    },
    {
      id: 'logical-deduction',
      title: 'Logical Deduction & Reasoning',
      iconName: 'Brain',
      description: 'Deductive reasoning and logical problem-solving skills',
      scoreField: 'logical_deduction_score',
      feedbackField: 'logical_deduction'
    },
    {
      id: 'mathematical-logic',
      title: 'Mathematical Logic & World Problems',
      iconName: 'Calculator',
      description: 'Mathematical reasoning and word problem solving',
      scoreField: 'mathematical_logic_score',
      feedbackField: 'mathematical_logic'
    },
    {
      id: 'clarity-of-thought',
      title: 'Clarity of Thought',
      iconName: 'MessageCircle',
      description: 'Ability to articulate reasoning clearly and logically',
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

/**
 * Enhanced configurations mapped by modern interview type
 */
export const INTERVIEW_TYPES_CONFIG: Record<ModernInterviewType, InterviewTypeConfig> = {
  '11-plus': ELEVEN_PLUS_CONFIG,
  'logic-puzzles': LOGIC_PUZZLES_CONFIG,
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