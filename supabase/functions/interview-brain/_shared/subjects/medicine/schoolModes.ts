/**
 * Per-school MMI timing configuration — the ONE shared source of truth for how each Medicine
 * interview TYPE (not subject — both types below share the same 'medicine' subject/pack/bank)
 * differs in station count and timing. Read by both interview-brain and generate-interview-feedback
 * (vendored via scripts/build-interview-brain.mjs) so the two never drift the way SUBJECT_BY_TYPE /
 * ENGINE_PACKS already do in each edge function.
 *
 * Every number below is a DIRECT QUOTE from the university's own admissions page, fetched and
 * verified on `dateChecked` — not from a coaching site. UCL was deliberately NOT added as a third
 * mode: UCL's own selection-interviews page explicitly declines to publish exact station count or
 * timing ("further detailed information will be provided to candidates when they are invited"),
 * and the "8 stations, 5 minutes, 1 minute reading" figure repeated across every coaching site is
 * third-party consensus, not a primary source — exactly the failure mode the research pack's own
 * confidence-rating convention exists to catch.
 */
export interface SchoolMode {
  interviewTypeId: string;
  university: string;
  /** Number of scored stations in a full mock — overrides the pack's own mockTargetQuestions. */
  mockTargetQuestions: number;
  timingSeconds: { prep: number; response: number };
  sourceUrl: string;
  dateChecked: string; // ISO date
  /** Verbatim quote(s) from the source, kept alongside the numbers so a reviewer can check the
   *  numbers below actually say what this claims without re-fetching the page. */
  verbatim: string;
}

export const MEDICINE_SCHOOL_MODES: SchoolMode[] = [
  {
    interviewTypeId: 'medicine-mmi',
    university: 'University of Leeds',
    mockTargetQuestions: 8,
    timingSeconds: { prep: 120, response: 360 },
    sourceUrl: 'https://medicinehealth.leeds.ac.uk/medicine/doc/preparing-mmi',
    dateChecked: '2026-09-02',
    verbatim:
      "Eight stations for Medicine. \"Each station lasts 6 minutes\" with \"2 minutes reading time " +
      "outside the station to prepare your answer and make brief notes.\" Delivery: \"Face to face on " +
      "the University campus.\" \"All information including the station outline and questions will be " +
      "available to read both outside and inside the station, the interviewer will read these " +
      "instructions out to you and you can ask for questions to be re-phrased if required.\"",
  },
  {
    interviewTypeId: 'medicine-mmi-manchester',
    university: 'University of Manchester',
    mockTargetQuestions: 5,
    timingSeconds: { prep: 0, response: 480 },
    sourceUrl: 'https://www.bmh.manchester.ac.uk/study/medicine/interviews/interview/',
    dateChecked: '2026-09-02',
    verbatim:
      "\"Five stations\", \"eight minutes each\". \"No information will be provided in advance, and " +
      "there will be no reading or writing component to any of the online or in-person interview " +
      "stations.\" Candidates choose in-person or Zoom; \"all candidates will be assessed and " +
      "interviews conducted in exactly the same way\" either way. Scoring is independent per station: " +
      "\"the interviewers do not see the scores from any other stations.\"",
  },
];

export function getSchoolMode(interviewTypeId: string): SchoolMode | undefined {
  return MEDICINE_SCHOOL_MODES.find((m) => m.interviewTypeId === interviewTypeId);
}
