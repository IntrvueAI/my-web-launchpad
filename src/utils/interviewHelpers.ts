/**
 * Interview Helper Functions
 * 
 * This file contains utility functions for working with interview data,
 * scores, and feedback. These functions are used across multiple components
 * to ensure consistent behavior and calculations.
 */

import { InterviewType, InterviewTypeConfig, BandThreshold } from '@/types/interview';
import { getInterviewTypeConfig } from '@/config/interviewTypes';

/**
 * Calculate the appropriate band label for a given score
 * 
 * @param score - The score to evaluate
 * @param interviewType - The type of interview
 * @returns The band label string
 */
export const getBandLabel = (
  score: number, 
  interviewType: InterviewType
): string => {
  const config = getInterviewTypeConfig(interviewType);
  
  // Find the appropriate band threshold
  for (const threshold of config.bandThresholds) {
    if (score >= threshold.minScore) {
      return threshold.label;
    }
  }
  
  // Fallback to the lowest band
  return config.bandThresholds[config.bandThresholds.length - 1]?.label || 'Unknown';
};

/**
 * Get the CSS color class for a score band
 * 
 * @param score - The score to evaluate
 * @param interviewType - The type of interview
 * @returns CSS class string for styling
 */
export const getBandColor = (
  score: number, 
  interviewType: InterviewType
): string => {
  const config = getInterviewTypeConfig(interviewType);
  
  // Find the appropriate band threshold
  for (const threshold of config.bandThresholds) {
    if (score >= threshold.minScore) {
      return threshold.colorClass;
    }
  }
  
  // Fallback to the lowest band color
  return config.bandThresholds[config.bandThresholds.length - 1]?.colorClass || 'bg-gray-500';
};

/**
 * Calculate percentage score for progress bars
 * 
 * @param score - The actual score
 * @param maxScore - The maximum possible score
 * @returns Percentage as a number between 0 and 100
 */
export const calculatePercentage = (score: number, maxScore: number): number => {
  if (maxScore === 0) return 0;
  return Math.round((score / maxScore) * 100);
};

/**
 * Format score display based on interview type
 * 
 * @param score - The score to format
 * @param interviewType - The type of interview
 * @param isTotal - Whether this is a total score or section score
 * @returns Formatted score string (e.g., "7.5/9.0" or "15/20")
 */
export const formatScore = (
  score: number, 
  interviewType: InterviewType, 
  isTotal: boolean = false
): string => {
  const config = getInterviewTypeConfig(interviewType);
  const maxScore = isTotal ? config.maxTotalScore : config.maxSectionScore;
  
  if (interviewType === 'ielts') {
    return `${score.toFixed(1)}/${maxScore.toFixed(1)}`;
  }
  
  return `${score}/${maxScore}`;
};

/**
 * Validate that a score is within acceptable range for an interview type
 * 
 * @param score - The score to validate
 * @param interviewType - The type of interview
 * @param isTotal - Whether this is a total score or section score
 * @returns True if score is valid, false otherwise
 */
export const isValidScore = (
  score: number, 
  interviewType: InterviewType, 
  isTotal: boolean = false
): boolean => {
  if (score < 0) return false;
  
  const config = getInterviewTypeConfig(interviewType);
  const maxScore = isTotal ? config.maxTotalScore : config.maxSectionScore;
  
  return score <= maxScore;
};

/**
 * Get band description for a score
 * 
 * @param score - The score to evaluate
 * @param interviewType - The type of interview
 * @returns Description of the performance level
 */
export const getBandDescription = (
  score: number, 
  interviewType: InterviewType
): string => {
  const config = getInterviewTypeConfig(interviewType);
  
  // Find the appropriate band threshold
  for (const threshold of config.bandThresholds) {
    if (score >= threshold.minScore) {
      return threshold.description;
    }
  }
  
  // Fallback to the lowest band description
  return config.bandThresholds[config.bandThresholds.length - 1]?.description || 'Unknown performance level';
};

/**
 * Parse and format feedback text with proper line breaks and structure
 * 
 * @param feedbackText - Raw feedback text
 * @returns Array of formatted paragraphs
 */
export const parseFeedbackText = (feedbackText: string): string[] => {
  if (!feedbackText) return [];
  
  return feedbackText
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);
};

/**
 * Check if a score represents a passing grade for the interview type
 * 
 * @param score - The total score
 * @param interviewType - The type of interview
 * @returns True if the score represents a passing grade
 */
export const isPassingScore = (
  score: number, 
  interviewType: InterviewType
): boolean => {
  const config = getInterviewTypeConfig(interviewType);
  const passingThreshold = config.maxTotalScore * 0.6; // 60% as general passing threshold
  
  return score >= passingThreshold;
};

/**
 * Generate performance insights based on section scores
 * 
 * @param scores - Object containing section scores
 * @param interviewType - The type of interview
 * @returns Object with strongest and weakest areas
 */
export const getPerformanceInsights = (
  scores: Record<string, number>, 
  interviewType: InterviewType
) => {
  const config = getInterviewTypeConfig(interviewType);
  const sections = config.sections;
  
  let strongestSection = '';
  let weakestSection = '';
  let highestScore = -1;
  let lowestScore = Infinity;
  
  sections.forEach(section => {
    const score = scores[section.scoreField] || 0;
    
    if (score > highestScore) {
      highestScore = score;
      strongestSection = section.title;
    }
    
    if (score < lowestScore) {
      lowestScore = score;
      weakestSection = section.title;
    }
  });
  
  return {
    strongest: strongestSection,
    weakest: weakestSection,
    highestScore,
    lowestScore
  };
};