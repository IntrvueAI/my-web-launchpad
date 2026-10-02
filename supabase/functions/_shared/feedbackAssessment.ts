export function assessmentFields(subject: string) {
  return subject === "elevenplus"
    ? [
        "personal_insight_score",
        "reasoning_score",
        "extracurricular_score",
        "current_awareness_score",
      ]
    : [
        "pattern_recognition_score",
        "logical_deduction_score",
        "mathematical_logic_score",
        "clarity_of_thought_score",
      ];
}

/** A single assessment produces scores, evidence, concise coaching and relevant highlights. */
export function assessmentResponseFormat(subject: string) {
  const fields = assessmentFields(subject);
  const textFields = fields.map((field) => field.replace(/_score$/, ""));
  const object = (properties: Record<string, unknown>) => ({
    type: "object",
    properties,
    required: Object.keys(properties),
    additionalProperties: false,
  });
  const text = { type: "string" };
  return {
    type: "json_schema",
    json_schema: {
      name: "interview_assessment",
      strict: true,
      schema: object({
        ...Object.fromEntries(
          fields.map((field) => [
            field,
            { type: ["number", "null"], minimum: 0, maximum: 5 },
          ]),
        ),
        score_evidence: object(
          Object.fromEntries(
            fields.map((field) => [field, { type: ["string", "null"] }]),
          ),
        ),
        detailed_feedback: object(
          Object.fromEntries(
            [
              ...textFields,
              "strength",
              "next_step",
              "overall",
              "band_assessment",
            ].map((field) => [field, text]),
          ),
        ),
        annotations: {
          type: "array",
          maxItems: 6,
          items: object({
            quote: text,
            category: { type: "string", enum: ["strength", "development"] },
            explanation: text,
            suggestion: text,
          }),
        },
      }),
    },
  };
}

export function studentRanges(transcript: string) {
  const ranges: { start: number; end: number }[] = [];
  const re = /(?:^|\n)[ \t]*(Student|Interviewer):[ \t]*/g;
  const labels = [...transcript.matchAll(re)];
  for (let i = 0; i < labels.length; i++) {
    if (labels[i][1] !== "Student") continue;
    ranges.push({
      start: labels[i].index! + labels[i][0].length,
      end: labels[i + 1]?.index ?? transcript.length,
    });
  }
  return ranges;
}

export function studentQuote(transcript: string, quote: unknown) {
  if (typeof quote !== "string" || !quote.trim()) return null;
  for (const range of studentRanges(transcript)) {
    const index = transcript.slice(range.start, range.end).indexOf(quote);
    if (index >= 0)
      return {
        start: range.start + index,
        end: range.start + index + quote.length,
      };
  }
  return null;
}

/** Keep display offsets unchanged while withholding unassessed setup/clarification turns. */
export function assessmentTranscript(
  transcript: string,
  ignore: (text: string) => boolean,
) {
  let masked = transcript;
  for (const { start, end } of studentRanges(transcript)) {
    if (ignore(transcript.slice(start, end).trim())) {
      masked =
        masked.slice(0, start) +
        transcript.slice(start, end).replace(/[^\r\n]/g, " ") +
        masked.slice(end);
    }
  }
  return masked;
}

export function groundAssessment(
  data: Record<string, any>,
  subject: string,
  transcript: string,
) {
  const fields = assessmentFields(subject);
  const quotes: Record<string, string> = {};
  for (const field of fields) {
    const score = data[field];
    if (
      score !== null &&
      (typeof score !== "number" ||
        !Number.isFinite(score) ||
        score < 0 ||
        score > 5)
    )
      throw new Error(`Invalid ${field}`);
    const quote = data.score_evidence?.[field];
    if (score !== null && studentQuote(transcript, quote))
      quotes[field] = quote;
    else {
      data[field] = null;
      data.detailed_feedback[field.replace(/_score$/, "")] =
        "Not assessed: there is not enough recorded evidence for this skill in this session.";
    }
  }
  data.total_score = fields.every((field) => typeof data[field] === "number")
    ? fields.reduce((total, field) => total + data[field], 0)
    : null;
  data.detailed_feedback.evidence_quotes = quotes;
  if (data.total_score === null)
    data.detailed_feedback.band_assessment =
      "Partial assessment: only skills supported by your recorded answers are scored.";
  delete data.score_evidence;
  return data;
}

export function groundedAnnotations(transcript: string, raw: unknown) {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  return raw
    .flatMap((a) => {
      if (
        !a ||
        !["strength", "development"].includes(a.category) ||
        typeof a.explanation !== "string"
      )
        return [];
      const position = studentQuote(transcript, a.quote);
      if (!position || seen.has(`${position.start}:${position.end}`)) return [];
      seen.add(`${position.start}:${position.end}`);
      return [
        {
          quote: a.quote,
          category: a.category,
          explanation: a.explanation,
          suggestion: typeof a.suggestion === "string" ? a.suggestion : "",
          ...position,
        },
      ];
    })
    .slice(0, 6);
}
