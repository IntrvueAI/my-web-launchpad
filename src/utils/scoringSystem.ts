import { InterviewType } from '@/config/interviewTypes';

export interface ScoreRange {
  min: number;
  max: number;
  type: '0-5' | '0-9' | '0-10';
}

export interface ScoreBand {
  label: string;
  description: string;
  color: string;
  range: [number, number];
}

/**
 * Get score range for an interview type
 */
export const getScoreRange = (scoringSystem: InterviewType['scoringSystem'], interviewId?: string): ScoreRange => {
  // Special case for 11+ which has 4 sections of 0-5 each (total 0-20)
  if (interviewId === '11-plus') {
    return { min: 0, max: 20, type: '0-5' };
  }
  
  switch (scoringSystem) {
    case '0-5':
      return { min: 0, max: 5, type: '0-5' };
    case '0-9':
      return { min: 0, max: 9, type: '0-9' };
    case '0-10':
      return { min: 0, max: 10, type: '0-10' };
    default:
      return { min: 0, max: 5, type: '0-5' };
  }
};

/**
 * Get score bands for different scoring systems
 */
export const getScoreBands = (scoringSystem: InterviewType['scoringSystem']): ScoreBand[] => {
  switch (scoringSystem) {
    case '0-5':
      return [
        { label: 'Outstanding', description: 'Exceptional performance', color: 'emerald', range: [5, 5] },
        { label: 'Strong', description: 'Very good performance', color: 'green', range: [4, 4] },
        { label: 'Good', description: 'Good standard achieved', color: 'blue', range: [3, 3] },
        { label: 'Developing', description: 'Shows potential, needs improvement', color: 'yellow', range: [2, 2] },
        { label: 'Needs Improvement', description: 'Requires significant development', color: 'orange', range: [1, 1] },
        { label: 'Insufficient', description: 'Well below expected standard', color: 'red', range: [0, 0] }
      ];
      
    case '0-9':
      return [
        { label: 'Expert User', description: 'Band 9 - Fully operational command', color: 'emerald', range: [9, 9] },
        { label: 'Very Good User', description: 'Band 8 - Fully operational with occasional inaccuracies', color: 'green', range: [8, 8] },
        { label: 'Good User', description: 'Band 7 - Operational command with some inaccuracies', color: 'blue', range: [7, 7] },
        { label: 'Competent User', description: 'Band 6 - Generally effective despite inaccuracies', color: 'cyan', range: [6, 6] },
        { label: 'Modest User', description: 'Band 5 - Partial command, copes with overall meaning', color: 'yellow', range: [5, 5] },
        { label: 'Limited User', description: 'Band 4 - Basic competence, frequent problems', color: 'orange', range: [4, 4] },
        { label: 'Extremely Limited', description: 'Band 3 - Conveys general meaning in familiar situations', color: 'red', range: [3, 3] },
        { label: 'Intermittent User', description: 'Band 2 - No real communication except basic information', color: 'red', range: [2, 2] },
        { label: 'Non-User', description: 'Band 1 - No ability except isolated words', color: 'red', range: [1, 1] },
        { label: 'No Attempt', description: 'Band 0 - Did not attempt', color: 'gray', range: [0, 0] }
      ];
      
    default:
      return getScoreBands('0-5');
  }
};

/**
 * Get score band for a specific score
 */
export const getScoreBand = (score: number, scoringSystem: InterviewType['scoringSystem']): ScoreBand => {
  const bands = getScoreBands(scoringSystem);
  const band = bands.find(b => score >= b.range[0] && score <= b.range[1]);
  return band || bands[bands.length - 1]; // Return lowest band if no match
};

/**
 * Calculate total score based on individual scores
 */
export const calculateTotalScore = (
  scores: number[], 
  scoringSystem: InterviewType['scoringSystem']
): number => {
  if (scores.length === 0) return 0;
  
  const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  const { max } = getScoreRange(scoringSystem);
  
  // Ensure score is within valid range
  return Math.max(0, Math.min(max, Math.round(average * 10) / 10));
};

/**
 * Convert score to percentage for progress bars
 */
export const scoreToPercentage = (score: number, scoringSystem: InterviewType['scoringSystem']): number => {
  const { max } = getScoreRange(scoringSystem);
  return Math.max(0, Math.min(100, (score / max) * 100));
};

/**
 * Get CSS classes for score band colors
 */
export const getScoreBandColorClasses = (color: string) => ({
  bg: `bg-${color}-100`,
  text: `text-${color}-800`,
  border: `border-${color}-200`,
  progress: `bg-${color}-500`
});