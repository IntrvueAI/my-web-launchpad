/**
 * Feedback Constants
 * 
 * This file contains constants used throughout the feedback system.
 * Centralizing these values makes them easy to maintain and update.
 */

/**
 * Default values for feedback system
 */
export const FEEDBACK_DEFAULTS = {
  /** Default scoring system if none specified */
  SCORING_SYSTEM: '0-5' as const,
  /** Default interview type if none specified */
  INTERVIEW_TYPE: '11-plus' as const,
  /** Default loading message */
  LOADING_MESSAGE: 'Generating Your Feedback...',
  /** Default loading description */
  LOADING_DESCRIPTION: 'Please wait while we analyze your interview performance'
};

/**
 * CSS classes for annotation categories
 * Used in the AnnotatedTranscript component
 */
export const ANNOTATION_STYLES = {
  strength: 'text-success underline underline-offset-2 decoration-2',
  grammar: 'text-destructive underline underline-offset-2 decoration-2',
  fluency: 'text-warning underline underline-offset-2 decoration-2',
  lexical: 'text-primary underline underline-offset-2 decoration-2'
} as const;

/**
 * Legend items for annotation categories
 */
export const ANNOTATION_LEGEND = [
  { category: 'strength', label: 'Strength', colorClass: 'bg-success' },
  { category: 'grammar', label: 'Grammar', colorClass: 'bg-destructive' },
  { category: 'fluency', label: 'Fluency', colorClass: 'bg-warning' },
  { category: 'lexical', label: 'Lexical Resource', colorClass: 'bg-primary' }
] as const;

/**
 * Feedback section identifiers
 * Used to parse structured feedback text
 */
export const FEEDBACK_SECTIONS = {
  WHAT_WENT_WELL: '**What went well**',
  EVEN_BETTER_IF: '**Even better if**'
} as const;

/**
 * Progress thresholds for different performance levels
 */
export const PERFORMANCE_THRESHOLDS = {
  EXCELLENT: 90,
  GOOD: 75,
  SATISFACTORY: 60,
  NEEDS_IMPROVEMENT: 40
} as const;

/**
 * Animation and transition durations (in milliseconds)
 */
export const ANIMATION_DURATIONS = {
  FAST: 150,
  NORMAL: 300,
  SLOW: 500
} as const;

/**
 * Common error messages
 */
export const ERROR_MESSAGES = {
  NO_FEEDBACK: 'No feedback available for this interview.',
  INVALID_SCORE: 'Invalid score provided.',
  LOADING_FAILED: 'Failed to load feedback. Please try again.',
  TRANSCRIPT_UNAVAILABLE: 'Transcript is not available for this interview.'
} as const;

/**
 * Success messages
 */
export const SUCCESS_MESSAGES = {
  FEEDBACK_LOADED: 'Feedback loaded successfully!',
  TRANSCRIPT_LOADED: 'Transcript loaded successfully!'
} as const;