import { InterviewType } from '@/config/interviewTypes';

/**
 * Flexible scoring utilities for the new JSONB scores system
 */

export interface FlexibleScores {
  [criteriaKey: string]: number;
}

export interface ScoreCalculation {
  scores: FlexibleScores;
  totalScore: number;
  maxPossibleScore: number;
  averageScore: number;
}

/**
 * Calculate scores for any interview type using the flexible system
 */
export const calculateFlexibleScores = (
  scores: FlexibleScores,
  interviewType: InterviewType
): ScoreCalculation => {
  const criteriaKeys = getCriteriaKeys(interviewType);
  const maxScore = getMaxScore(interviewType.scoringSystem);
  
  // Ensure all criteria have scores
  const normalizedScores: FlexibleScores = {};
  criteriaKeys.forEach(key => {
    normalizedScores[key] = scores[key] || 0;
  });
  
  const scoreValues = Object.values(normalizedScores);
  const totalScore = scoreValues.reduce((sum, score) => sum + score, 0);
  const maxPossibleScore = criteriaKeys.length * maxScore;
  const averageScore = scoreValues.length > 0 ? totalScore / scoreValues.length : 0;
  
  return {
    scores: normalizedScores,
    totalScore,
    maxPossibleScore,
    averageScore
  };
};

/**
 * Get criteria keys for an interview type (derived from scoringCriteria)
 */
export const getCriteriaKeys = (interviewType: InterviewType): string[] => {
  return interviewType.scoringCriteria.map(criteria => 
    criteria.toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '')
  );
};

/**
 * Get human-readable criteria names
 */
export const getCriteriaDisplayNames = (interviewType: InterviewType): Record<string, string> => {
  const keys = getCriteriaKeys(interviewType);
  const names: Record<string, string> = {};
  
  interviewType.scoringCriteria.forEach((criteria, index) => {
    names[keys[index]] = criteria;
  });
  
  return names;
};

/**
 * Get max score for a scoring system
 */
export const getMaxScore = (scoringSystem: string): number => {
  switch (scoringSystem) {
    case '0-5': return 5;
    case '0-9': return 9;
    case '0-10': return 10;
    default: return 5;
  }
};

/**
 * Convert legacy scores to flexible format
 */
export const convertLegacyScores = (
  legacyScores: any,
  interviewType: InterviewType
): FlexibleScores => {
  const criteriaKeys = getCriteriaKeys(interviewType);
  const flexibleScores: FlexibleScores = {};
  
  // Map legacy field names to criteria keys
  const legacyMapping: Record<string, string[]> = {
    'personal_insight_score': ['personal_insight_self_awareness'],
    'reasoning_score': ['reasoning_problem_solving'],
    'extracurricular_score': ['extracurricular_activities_leadership'],
    'current_awareness_score': ['current_awareness_curiosity'],
    'fluency_coherence_score': ['fluency_and_coherence'],
    'lexical_resource_score': ['lexical_resource'],
    'grammatical_range_score': ['grammatical_range_and_accuracy'],
    'pronunciation_score': ['pronunciation']
  };
  
  // Convert legacy scores to flexible format
  Object.entries(legacyMapping).forEach(([legacyKey, possibleKeys]) => {
    if (legacyScores[legacyKey] !== undefined) {
      const matchingKey = possibleKeys.find(key => criteriaKeys.includes(key));
      if (matchingKey) {
        flexibleScores[matchingKey] = legacyScores[legacyKey];
      }
    }
  });
  
  return flexibleScores;
};

/**
 * Validate scores against interview type constraints
 */
export const validateScores = (
  scores: FlexibleScores,
  interviewType: InterviewType
): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  const maxScore = getMaxScore(interviewType.scoringSystem);
  const criteriaKeys = getCriteriaKeys(interviewType);
  
  // Check if all required criteria have scores
  criteriaKeys.forEach(key => {
    if (scores[key] === undefined) {
      errors.push(`Missing score for criteria: ${key}`);
    } else if (scores[key] < 0 || scores[key] > maxScore) {
      errors.push(`Score for ${key} must be between 0 and ${maxScore}`);
    }
  });
  
  // Check for unexpected scores
  Object.keys(scores).forEach(key => {
    if (!criteriaKeys.includes(key)) {
      errors.push(`Unexpected score criteria: ${key}`);
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors
  };
};