// Input validation and sanitization utilities
import DOMPurify from 'dompurify';
import { recordSuspiciousRequest } from './securityMonitor';

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Password validation - at least 8 chars, one uppercase, one lowercase, one number
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

// Name validation - only letters, spaces, hyphens, apostrophes
const NAME_REGEX = /^[a-zA-Z\s'-]+$/;

export const validateEmail = (email: string): { isValid: boolean; error?: string } => {
  if (!email) {
    return { isValid: false, error: 'Email is required' };
  }
  
  if (email.length > 254) {
    return { isValid: false, error: 'Email is too long' };
  }
  
  if (!EMAIL_REGEX.test(email)) {
    return { isValid: false, error: 'Please enter a valid email address' };
  }
  
  return { isValid: true };
};

export const validatePassword = (password: string): { isValid: boolean; error?: string } => {
  if (!password) {
    return { isValid: false, error: 'Password is required' };
  }
  
  if (password.length < 8) {
    return { isValid: false, error: 'Password must be at least 8 characters long' };
  }
  
  if (password.length > 128) {
    return { isValid: false, error: 'Password is too long' };
  }
  
  if (!PASSWORD_REGEX.test(password)) {
    return { isValid: false, error: 'Password must contain at least one uppercase letter, one lowercase letter, and one number' };
  }
  
  return { isValid: true };
};

export const validateName = (name: string): { isValid: boolean; error?: string } => {
  if (!name) {
    return { isValid: false, error: 'Name is required' };
  }
  
  if (name.length < 2) {
    return { isValid: false, error: 'Name must be at least 2 characters long' };
  }
  
  if (name.length > 100) {
    return { isValid: false, error: 'Name is too long' };
  }
  
  if (!NAME_REGEX.test(name)) {
    return { isValid: false, error: 'Name can only contain letters, spaces, hyphens, and apostrophes' };
  }
  
  return { isValid: true };
};

export const sanitizeInput = (input: string): string => {
  if (typeof input !== 'string') {
    return '';
  }
  
  // Check for suspicious patterns
  const suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /eval\s*\(/i,
    /alert\s*\(/i,
    /document\./i,
    /window\./i,
    /<iframe/i,
    /<object/i,
    /<embed/i,
  ];
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(input)) {
      recordSuspiciousRequest({
        type: 'xss_attempt',
        pattern: pattern.source,
        input: input.slice(0, 100), // Log first 100 chars only
        timestamp: Date.now()
      });
      break;
    }
  }
  
  // Remove any potential XSS content
  return DOMPurify.sanitize(input.trim(), { 
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: []
  });
};

export const validateTranscription = (transcription: string): { isValid: boolean; error?: string } => {
  if (!transcription || typeof transcription !== 'string') {
    return { isValid: false, error: 'Transcription is required' };
  }
  
  const sanitized = sanitizeInput(transcription);
  
  if (sanitized.length < 10) {
    return { isValid: false, error: 'Transcription too short - minimum 10 characters required' };
  }
  
  if (sanitized.length > 50000) {
    return { isValid: false, error: 'Transcription too long - maximum 50,000 characters allowed' };
  }
  
  return { isValid: true };
};

export const validateSessionId = (sessionId: string): { isValid: boolean; error?: string } => {
  if (!sessionId || typeof sessionId !== 'string') {
    return { isValid: false, error: 'Session ID is required' };
  }
  
  // UUID format validation
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  
  if (!UUID_REGEX.test(sessionId)) {
    return { isValid: false, error: 'Invalid session ID format' };
  }
  
  return { isValid: true };
};

export const validateInterviewType = (interviewType: string): { isValid: boolean; error?: string } => {
  const validTypes = ['11-plus', 'ielts', 'logic-puzzles', 'maths-interview', 'demo'];
  
  if (!interviewType || typeof interviewType !== 'string') {
    return { isValid: false, error: 'Interview type is required' };
  }
  
  if (!validTypes.includes(interviewType.toLowerCase())) {
    return { isValid: false, error: 'Invalid interview type' };
  }
  
  return { isValid: true };
};

export const validateScoringSystem = (scoringSystem: string): { isValid: boolean; error?: string } => {
  const validSystems = ['0-5', '0-9'];
  
  if (!scoringSystem || typeof scoringSystem !== 'string') {
    return { isValid: false, error: 'Scoring system is required' };
  }
  
  if (!validSystems.includes(scoringSystem)) {
    return { isValid: false, error: 'Invalid scoring system' };
  }
  
  return { isValid: true };
};