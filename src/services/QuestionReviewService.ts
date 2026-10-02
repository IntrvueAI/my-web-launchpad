import { supabase } from "@/integrations/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { QuestionReview, ReviewStatus } from "@/lib/questionReview";

type ReviewEvent = Omit<QuestionReview, "updated_at"> & {
  id: string;
  created_at: string;
};
type ReadTable<Row> = {
  Row: { [Key in keyof Row]: Row[Key] };
  Insert: never;
  Update: never;
  Relationships: [];
};
// Narrow database contract for this additive migration; the shared generated schema predates these tables.
type ReviewDatabase = {
  public: {
    Tables: {
      interview_question_reviews: ReadTable<QuestionReview>;
      interview_question_review_events: ReadTable<ReviewEvent>;
    };
    Views: Record<never, never>;
    Functions: {
      save_interview_question_review: {
        Args: {
          p_batch_id: string;
          p_question_id: string;
          p_content_hash: string;
          p_status: string;
          p_notes: string;
          p_expected_revision: number;
        };
        Returns: QuestionReview;
      };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};
const db = supabase as unknown as SupabaseClient<ReviewDatabase>;
export const QuestionReviewService = {
  async list(batchId: string): Promise<QuestionReview[]> {
    const { data, error } = await db
      .from("interview_question_reviews")
      .select("*")
      .eq("batch_id", batchId)
      .abortSignal(AbortSignal.timeout(20_000));
    if (error) throw error;
    return data ?? [];
  },
  async history(batchId: string, questionId: string): Promise<ReviewEvent[]> {
    const { data, error } = await db
      .from("interview_question_review_events")
      .select("*")
      .eq("batch_id", batchId)
      .eq("question_id", questionId)
      .order("revision", { ascending: false })
      .limit(20)
      .abortSignal(AbortSignal.timeout(20_000));
    if (error) throw error;
    return data ?? [];
  },
  async save(
    batchId: string,
    questionId: string,
    hash: string,
    status: ReviewStatus,
    notes: string,
    revision: number,
  ): Promise<QuestionReview> {
    const { data, error } = await db
      .rpc("save_interview_question_review", {
        p_batch_id: batchId,
        p_question_id: questionId,
        p_content_hash: hash,
        p_status: status,
        p_notes: notes,
        p_expected_revision: revision,
      })
      .abortSignal(AbortSignal.timeout(20_000));
    if (error) throw error;
    if (!data) throw new Error("The decision was not saved. Please retry.");
    return data as QuestionReview;
  },
};
