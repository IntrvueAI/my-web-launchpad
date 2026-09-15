import type { BankQuestion } from "../engine/types";

/** Preserve authored runtime fields when a DB row uses snake_case column names. */
export function normalizeQuestionRow(
  row: Record<string, unknown>,
  bundled?: BankQuestion,
): BankQuestion {
  const aliases: Record<string, string> = {
    question_type: "questionType",
    model_reasoning_path: "modelReasoningPath",
    common_mistakes: "commonMistakes",
    live_probes: "liveProbes",
    current_affairs_expiry: "currentAffairsExpiry",
    clinical_review_required: "clinicalReviewRequired",
  };
  const normalized = { ...row };
  // Legacy schemas lacked these columns. Enrich only an unchanged known prompt; never override
  // an explicit database value (including null), or attach an actor to an edited scenario.
  if (bundled && bundled.question === row.question) {
    for (const [camel, snake] of [
      ["roleplay", "roleplay"],
      ["format", "format"],
      ["currentAffairsExpiry", "current_affairs_expiry"],
      ["clinicalReviewRequired", "clinical_review_required"],
    ]) {
      if (!(snake in row) && !(camel in row))
        normalized[camel] = (bundled as unknown as Record<string, unknown>)[
          camel
        ];
    }
  }
  for (const [column, field] of Object.entries(aliases)) {
    if (row[column] !== undefined) normalized[field] = row[column];
    delete normalized[column];
  }
  return normalized as unknown as BankQuestion;
}
