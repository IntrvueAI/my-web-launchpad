import { describe, it, expect } from 'vitest';
import { censorFeedback, censorTranscript } from './transcript';
describe('Transcript display filtering', () => {
  it('censors swearing and common obfuscations without moving annotation offsets', () => {
    const input = 'Student: FUCK, fucking, sh1t, bullshit, f.u.c.k, wanker. I would listen.';
    const output = censorTranscript(input);
    expect(output).toBe('Student: ****, *******, ****, ********, *.*.*.*, ******. I would listen.');
    expect(output.length).toBe(input.length);
    expect(output.indexOf('I would listen')).toBe(input.indexOf('I would listen'));
    expect(censorTranscript(output)).toBe(output);
  });
  it('preserves ordinary names, anatomical context and words containing matching fragments', () => {
    const input = 'Scunthorpe, assessment, therapist, shellfish, a bloody wound, Dick Whittington, counselling.';
    expect(censorTranscript(input)).toBe(input);
  });
  it('censors quoted answers and annotations as well as the transcript without mutating evidence', () => {
    const input = { transcription:'Student: shit', annotations:[{quote:'shit',start:9,end:13}], questions_review:[{your_answer:'shit happens'}], total_score:12 };
    const output = censorFeedback(input);
    expect(output.annotations[0]).toEqual({quote:'****',start:9,end:13});
    expect(output.questions_review[0].your_answer).toBe('**** happens');
    expect(input.transcription).toBe('Student: shit');
    expect(output.total_score).toBe(12);
  });
});
