import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock DOMPurify (browser-only lib) and the security monitor
vi.mock('dompurify', () => ({
  default: { sanitize: (input: string) => input },
}));
vi.mock('../securityMonitor', () => ({
  recordSuspiciousRequest: vi.fn(),
}));

import {
  validateEmail,
  validatePassword,
  validateName,
  validateTranscription,
  validateSessionId,
  validateInterviewType,
  validateScoringSystem,
} from '../inputValidation';

describe('validateEmail', () => {
  it('accepts a valid email', () => {
    expect(validateEmail('user@example.com').isValid).toBe(true);
  });

  it('rejects empty string', () => {
    expect(validateEmail('').isValid).toBe(false);
  });

  it('rejects email without @', () => {
    expect(validateEmail('notanemail').isValid).toBe(false);
  });

  it('rejects email longer than 254 chars', () => {
    expect(validateEmail('a'.repeat(250) + '@b.c').isValid).toBe(false);
  });
});

describe('validatePassword', () => {
  it('accepts a valid password', () => {
    expect(validatePassword('Secure123').isValid).toBe(true);
  });

  it('rejects short password', () => {
    expect(validatePassword('Ab1').isValid).toBe(false);
  });

  it('rejects password with no uppercase', () => {
    expect(validatePassword('secure123').isValid).toBe(false);
  });

  it('rejects password with no number', () => {
    expect(validatePassword('SecurePass').isValid).toBe(false);
  });

  it('rejects password longer than 128 chars', () => {
    expect(validatePassword('Aa1' + 'x'.repeat(130)).isValid).toBe(false);
  });
});

describe('validateName', () => {
  it('accepts a valid name', () => {
    expect(validateName('John Smith').isValid).toBe(true);
  });

  it('accepts name with hyphen and apostrophe', () => {
    expect(validateName("O'Brien-Smith").isValid).toBe(true);
  });

  it('rejects single character name', () => {
    expect(validateName('A').isValid).toBe(false);
  });

  it('rejects name with numbers', () => {
    expect(validateName('John123').isValid).toBe(false);
  });

  it('rejects empty name', () => {
    expect(validateName('').isValid).toBe(false);
  });
});

describe('validateTranscription', () => {
  it('accepts a valid transcription', () => {
    const long = 'This is a valid transcription with enough content to pass validation.';
    expect(validateTranscription(long).isValid).toBe(true);
  });

  it('rejects transcription under 10 characters', () => {
    expect(validateTranscription('Short').isValid).toBe(false);
  });

  it('rejects transcription over 50,000 characters', () => {
    expect(validateTranscription('a'.repeat(50001)).isValid).toBe(false);
  });

  it('rejects empty transcription', () => {
    expect(validateTranscription('').isValid).toBe(false);
  });
});

describe('validateSessionId', () => {
  it('accepts a valid UUID', () => {
    expect(validateSessionId('550e8400-e29b-41d4-a716-446655440000').isValid).toBe(true);
  });

  it('rejects a non-UUID string', () => {
    expect(validateSessionId('not-a-uuid').isValid).toBe(false);
  });

  it('rejects empty string', () => {
    expect(validateSessionId('').isValid).toBe(false);
  });
});

describe('validateInterviewType', () => {
  it('accepts 11-plus', () => {
    expect(validateInterviewType('11-plus').isValid).toBe(true);
  });

  it('accepts logic-puzzles', () => {
    expect(validateInterviewType('logic-puzzles').isValid).toBe(true);
  });

  it('accepts demo', () => {
    expect(validateInterviewType('demo').isValid).toBe(true);
  });

  it('rejects unknown type', () => {
    expect(validateInterviewType('unknown-type').isValid).toBe(false);
  });

  it('rejects empty string', () => {
    expect(validateInterviewType('').isValid).toBe(false);
  });
});

describe('validateScoringSystem', () => {
  it('accepts 0-5', () => {
    expect(validateScoringSystem('0-5').isValid).toBe(true);
  });

  it('accepts 0-9', () => {
    expect(validateScoringSystem('0-9').isValid).toBe(true);
  });

  it('rejects unknown system', () => {
    expect(validateScoringSystem('0-100').isValid).toBe(false);
  });
});
