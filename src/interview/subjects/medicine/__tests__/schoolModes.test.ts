import { describe, it, expect } from 'vitest';
import { getSchoolMode, MEDICINE_SCHOOL_MODES } from '../schoolModes';

describe('Medicine school modes', () => {
  it('has exactly the two verified school modes', () => {
    expect(MEDICINE_SCHOOL_MODES.map((m) => m.interviewTypeId).sort()).toEqual(
      ['medicine-mmi', 'medicine-mmi-manchester'].sort(),
    );
  });

  it('Leeds mode has real reading time and 8 stations', () => {
    const leeds = getSchoolMode('medicine-mmi')!;
    expect(leeds.university).toBe('University of Leeds');
    expect(leeds.mockTargetQuestions).toBe(8);
    expect(leeds.timingSeconds).toEqual({ prep: 120, response: 360 });
  });

  it('Manchester mode has zero reading time and 5 stations', () => {
    const manchester = getSchoolMode('medicine-mmi-manchester')!;
    expect(manchester.university).toBe('University of Manchester');
    expect(manchester.mockTargetQuestions).toBe(5);
    expect(manchester.timingSeconds).toEqual({ prep: 0, response: 480 });
  });

  it('returns undefined for any interview type without a verified school mode', () => {
    expect(getSchoolMode('maths-interview')).toBeUndefined();
    expect(getSchoolMode('medicine-mmi-ucl')).toBeUndefined(); // deliberately never added — see file header
  });
});
