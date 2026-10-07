import { supabase } from "@/integrations/supabase/client";

export const MEDICINE_PRODUCT_FEEDBACK = "medicine-platform";
export const FEEDBACK_COMMENT_LIMIT = 1000;

export async function submitMedicineProductFeedback(input: {
  id: string;
  userId: string;
  email?: string;
  comment: string;
  rating: number;
}) {
  const comment = input.comment.trim();
  if (
    (!comment && !input.rating) ||
    comment.length > FEEDBACK_COMMENT_LIMIT ||
    !Number.isInteger(input.rating) ||
    input.rating < 0 ||
    input.rating > 5
  ) {
    throw new Error("Add a message or rating before sending.");
  }
  const { error } = await supabase.from("interview_feedback_shares").insert({
    id: input.id,
    user_id: input.userId,
    user_email: input.email ?? null,
    interview_type: MEDICINE_PRODUCT_FEEDBACK,
    session_reference: null,
    comment: comment || null,
    rating: input.rating || null,
    share_transcript: false,
    transcript: null,
  });
  // A connection can drop after a successful write. Reuse the submission ID
  // for an unchanged retry so the same message is not stored twice.
  if (error?.code === "23505") {
    const existing = await supabase
      .from("interview_feedback_shares")
      .select("id")
      .eq("id", input.id)
      .eq("user_id", input.userId)
      .maybeSingle();
    if (!existing.error && existing.data) return;
  }
  if (error) throw error;
}
