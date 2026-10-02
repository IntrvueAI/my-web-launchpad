import { describe, expect, it } from "vitest";
import {
  assessmentFields,
  assessmentResponseFormat,
  assessmentTranscript,
  groundAssessment,
  groundedAnnotations,
} from "../functions/_shared/feedbackAssessment";
import { asksToClarifyTask } from "../../src/interview/engine/publicPrompt";

const transcript =
  "Interviewer: I would listen carefully.\nStudent: I would ask what matters most to them.\nStudent: Then I would check with the organiser.\nInterviewer: Thank you.";
const fields = assessmentFields("medicine");
const assessment = () => ({
  ...Object.fromEntries(fields.map((field) => [field, 3])),
  detailed_feedback: { overall: "You considered their priorities." },
  score_evidence: Object.fromEntries(
    fields.map((field) => [field, "I would ask what matters most to them."]),
  ),
});
describe("Evidence-grounded feedback", () => {
  it("excludes clarification from assessment without changing highlight positions", () => {
    const original =
      transcript +
      "\nStudent: Sorry, what's the question?\nInterviewer: Here is the task.\nStudent: I would check the evidence.";
    const masked = assessmentTranscript(original, asksToClarifyTask);
    expect(masked.length).toBe(original.length);
    expect(masked).not.toContain("Sorry, what's the question?");
    const result = groundedAnnotations(masked, [
      {
        quote: "Sorry, what's the question?",
        category: "development",
        explanation: "Invalid criticism",
      },
      {
        quote: "I would check the evidence.",
        category: "strength",
        explanation: "Checks evidence",
      },
    ]);
    expect(result).toHaveLength(1);
    expect(original.slice(result[0].start, result[0].end)).toBe(
      "I would check the evidence.",
    );
    const data = assessment();
    data.score_evidence[fields[0]] = "Sorry, what's the question?";
    expect(groundAssessment(data, "medicine", masked)[fields[0]]).toBeNull();
  });
  it("computes a complete total from validated scores, ignoring a supplied total", () => {
    const data = groundAssessment(
      { ...assessment(), total_score: 100 },
      "medicine",
      transcript,
    );
    expect(data.total_score).toBe(12);
    expect(Object.keys(data.detailed_feedback.evidence_quotes)).toHaveLength(4);
  });
  it("does not turn an unobserved skill into zero or an incomplete total into an admission band", () => {
    const data = assessment();
    data[fields[3]] = null;
    const result = groundAssessment(data, "medicine", transcript);
    expect(result.total_score).toBeNull();
    expect(result[fields[3]]).toBeNull();
    expect(result.detailed_feedback.clarity_of_thought).toContain(
      "Not assessed",
    );
    expect(result.detailed_feedback.band_assessment).toContain(
      "Partial assessment",
    );
  });
  it("rejects invented quotes and interviewer quotes as scoring evidence", () => {
    const data = assessment();
    data.score_evidence[fields[0]] = "I would listen carefully.";
    data.score_evidence[fields[1]] = "I was calm and confident.";
    const result = groundAssessment(data, "medicine", transcript);
    expect(result[fields[0]]).toBeNull();
    expect(result[fields[1]]).toBeNull();
  });
  it.each([-1, 6, "3", undefined, NaN])(
    "does not accept malformed score %s",
    (score) => {
      expect(() =>
        groundAssessment(
          { ...assessment(), [fields[0]]: score },
          "medicine",
          transcript,
        ),
      ).toThrow("Invalid");
    },
  );
  it("keeps valid zero evidence distinct from no assessment", () => {
    expect(
      groundAssessment(
        { ...assessment(), [fields[0]]: 0 },
        "medicine",
        transcript,
      )[fields[0]],
    ).toBe(0);
  });
  it("finds exact student quotes across consecutive turns and discards incorrect categories and duplicates", () => {
    const quote = "check with the organiser";
    const raw = [
      {
        quote,
        category: "development",
        explanation: "Make your next step specific.",
        start: 0,
        end: 10,
      },
      { quote, category: "development", explanation: "Duplicate" },
      {
        quote: "I would listen carefully.",
        category: "strength",
        explanation: "Interviewer words",
      },
      { quote, category: "fluency", explanation: "Assumed speaking speed" },
      {
        quote: "not in the transcript",
        category: "strength",
        explanation: "Invented",
      },
    ];
    const result = groundedAnnotations(transcript, raw);
    expect(result).toHaveLength(1);
    expect(transcript.slice(result[0].start, result[0].end)).toBe(quote);
  });
  it("requires evidence and nullable score fields in the provider schema for both rubrics", () => {
    for (const subject of ["medicine", "elevenplus"]) {
      const format = assessmentResponseFormat(subject);
      expect(format.json_schema.strict).toBe(true);
      const schema = format.json_schema.schema;
      expect(schema.required).toContain("score_evidence");
      expect(schema.additionalProperties).toBe(false);
      for (const field of assessmentFields(subject))
        expect(schema.properties[field]).toMatchObject({
          type: ["number", "null"],
        });
    }
  });
});
