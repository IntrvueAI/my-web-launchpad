/**
 * Centralized type definitions for interview system
 * 
 * This file contains all the core interfaces and types used throughout
 * the interview and feedback system. It provides type safety and
 * consistency across different interview types.
 */

// Core interview system types
export type InterviewType = '11-plus' | 'ielts' | 'oxbridge' | 'grammar-school' | 'scholarship' | 'logic-puzzles' | 'maths-interview' | 'verbal-interview';
export type ScoringSystem = '0-5' | '0-9' | '0-20' | '0-7';
export type AnnotationCategory = 'strength' | 'grammar' | 'fluency' | 'lexical';

/**
 * Represents an annotation on a transcript
 * Used for highlighting specific parts of the conversation
 */
export interface Annotation {
  /** The exact text being annotated */
  quote: string;
  /** Category of the annotation for styling and grouping */
  category: AnnotationCategory;
  /** Detailed explanation of the annotation */
  explanation: string;
  /** Optional suggestion for improvement */
  suggestion?: string;
  /** Character start position in the transcript */
  start?: number;
  /** Character end position in the transcript */
  end?: number;
}

/**
 * Configuration for a specific interview type
 * Defines the structure and scoring for each interview format
 */
export interface InterviewTypeConfig {
  /** Display name for the interview type */
  name: string;
  /** Short description of the interview */
  description: string;
  /** Scoring system used (affects max scores) */
  scoringSystem: ScoringSystem;
  /** Maximum possible total score */
  maxTotalScore: number;
  /** Maximum score for individual sections */
  maxSectionScore: number;
  /** Sections that are scored in this interview type */
  sections: InterviewSection[];
  /** Threshold scores for different performance bands */
  bandThresholds: BandThreshold[];
}

/**
 * Represents a scored section of an interview
 */
export interface InterviewSection {
  /** Unique identifier for the section */
  id: string;
  /** Display title for the section */
  title: string;
  /** Icon component name from lucide-react */
  iconName: string;
  /** Brief description of what this section measures */
  description: string;
  /** Database field name for the score */
  scoreField: keyof FeedbackScores;
  /** Database field name for the detailed feedback */
  feedbackField: string;
}

/**
 * Performance band threshold definition
 */
export interface BandThreshold {
  /** Minimum score for this band */
  minScore: number;
  /** Display label for this performance level */
  label: string;
  /** CSS class for styling this band */
  colorClass: string;
  /** Brief description of this performance level */
  description: string;
}

/**
 * All possible scores that can be stored in the database
 * This interface maps to the feedback table structure
 */
export interface FeedbackScores {
  // 11-plus specific scores
  personal_insight_score?: number;
  reasoning_score?: number;
  extracurricular_score?: number;
  current_awareness_score?: number;
  
  // IELTS specific scores
  fluency_coherence_score?: number;
  lexical_resource_score?: number;
  grammatical_range_score?: number;
  pronunciation_score?: number;
  
  // Logic puzzles specific scores
  pattern_recognition_score?: number;
  logical_deduction_score?: number;
  mathematical_logic_score?: number;
  clarity_of_thought_score?: number;
  
  // Common fields
  total_score: number;
}

/**
 * Detailed feedback text for each section
 */
export interface DetailedFeedback {
  // 11-plus feedback sections
  personal_insight?: string;
  reasoning?: string;
  extracurricular?: string;
  current_awareness?: string;
  
  // IELTS feedback sections
  fluency_coherence?: string;
  lexical_resource?: string;
  grammatical_range?: string;
  pronunciation?: string;
  
  // Logic puzzles feedback sections
  pattern_recognition?: string;
  logical_deduction?: string;
  mathematical_logic?: string;
  clarity_of_thought?: string;
  
  // Common feedback
  overall: string;
  band_assessment: string;
}

/**
 * Complete feedback data structure
 * This represents all the feedback information for a completed interview
 */
export interface FeedbackData extends FeedbackScores {
  /** Structured detailed feedback for each section */
  detailed_feedback: DetailedFeedback;
  /** Full interview transcript (optional) */
  transcription?: string;
  /** Annotations on the transcript (optional) */
  annotations?: Annotation[];
  /** Overall improvement feedback and action plan */
  overall_improvement_feedback?: string;
}

/**
 * Props for feedback-related components
 */
export interface FeedbackComponentProps {
  /** The feedback data to display */
  feedback: FeedbackData;
  /** Type of interview this feedback is for */
  interviewType: InterviewType;
  /** Scoring system used */
  scoringSystem?: ScoringSystem;
  /** Whether the component is in a loading state */
  isLoading?: boolean;
}

/**
 * Historical feedback record from the database
 */
export interface FeedbackRecord extends FeedbackScores {
  id: string;
  created_at: string;
  detailed_feedback: DetailedFeedback;
  interview_session_id: string;
  interview_type?: string;
  scoring_system?: string;
  transcription?: string;
  annotations?: Annotation[];
  overall_improvement_feedback?: string;
  session_reference?: string;
}