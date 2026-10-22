import { guestSupabase, supabase } from "@/integrations/supabase/client";
import { MEDICINE_LIVE_INTERVIEW_IDS, RETIRED_MEDICINE_INTERVIEW_IDS } from '@/config/interviewTypes';
/** Beta invitations exist for each product; the server enforces which interviews each may start. */
export type TrialProduct = "medicine" | "11plus";
export const GUEST_INTERVIEW_IDS = MEDICINE_LIVE_INTERVIEW_IDS;
export const SCHOOL_GUEST_INTERVIEW_IDS = ["11-plus", "maths-interview", "logic-puzzles", "current-affairs-interview"] as const;
export const guestInterviewIds = (product: TrialProduct = "medicine"): readonly string[] =>
  product === "11plus" ? SCHOOL_GUEST_INTERVIEW_IDS : GUEST_INTERVIEW_IDS;
export const GUEST_HISTORY_INTERVIEW_IDS = [...GUEST_INTERVIEW_IDS, ...RETIRED_MEDICINE_INTERVIEW_IDS, ...SCHOOL_GUEST_INTERVIEW_IDS];
export const TRIAL_BRAND: Record<TrialProduct, string> = { medicine: "MMI Practice", "11plus": "intrvue.ai" };
export interface TrialInvite {
  id: string;
  label: string;
  expires_at: string;
  revoked_at: string | null;
  max_guests: number;
  max_interviews: number;
  guest_hours: number;
  code: string;
  link_code?: string | null;
  product?: TrialProduct;
  guest_count?: number;
  attempts_used?: number;
  review_count?: number;
}
export interface TrialStatus {
  name: string;
  expiresAt: string;
  remaining: number;
  maxInterviews: number;
  trialId: string;
  interviewsStarted: number;
  phase: "practice" | "review" | "complete";
  accessClosed: boolean;
  product?: TrialProduct;
  review: TrialReview | null;
}
export interface TrialGuest {
  id: string;
  display_name: string;
  guest_user_id: string | null;
  created_at: string;
  expires_at: string;
  interviews_started: number;
  review_required_at: string | null;
}
export interface TrialReview {
  trial_id: string;
  rating: number;
  experience: "smooth" | "some-issues" | "could-not-complete";
  improvement: string;
  created_at: string;
}
export const trialReviewExperience = {
  smooth: "Everything worked",
  "some-issues": "I had a few issues",
  "could-not-complete": "I couldn't complete an interview",
};
export function trialInvitationPath(invite: TrialInvite): string {
  if (!invite.link_code) return `/try#${invite.code}`;
  return invite.product === "11plus" ? `/11plus/${invite.link_code}` : `/medicine/${invite.link_code}`;
}
/** Private invitation paths are kept out of logs, search engines and referrers. */
export const PRIVATE_INVITATION_PATH = /^\/(?:medicine|11plus)\/[A-Za-z0-9_-]{22}$/;
export interface TrialFeedback {
  id: string;
  user_id: string;
  interview_type: string;
  total_score: number | null;
  created_at: string;
  detailed_feedback: Record<string, string> | null;
}
export interface TrialInterviewSummary {
  id: string;
  feedback_id: string | null;
  interview_type: string;
  created_at: string;
  status: string;
  total_score: number | null;
  overview: string | null;
}
export interface TrialInboxEntry {
  id: string;
  display_name: string;
  created_at: string;
  updated_at: string;
  interviews_started: number;
  invite_id: string;
  invite_label: string;
  product?: TrialProduct;
  review: TrialReview | null;
  interviews: TrialInterviewSummary[];
}
export interface TrialInbox {
  total: number;
  page: number;
  pageSize: number;
  summary: {
    testers: number;
    assessments: number;
    reviews: number;
    issues: number;
    averageRating: number | null;
  };
  trials: TrialInboxEntry[];
}
export class TrialError extends Error {
  constructor(
    message: string,
    public status?: number,
  ) {
    super(message);
  }
}
export async function trialApi<T>(
  body: Record<string, unknown>,
  guest = false,
): Promise<T> {
  // Invitation codes, names and auth tokens must never enter the generic request-body logger.
  const { data, error } = await (
    guest ? guestSupabase : supabase
  ).functions.invoke("mmi-guest-access", { body });
  if (error) {
    let message = "Unable to reach guest trials. Please try again.";
    const status =
      error.context instanceof Response ? error.context.status : undefined;
    try {
      const result = await error.context.json();
      if (typeof result.error === "string") message = result.error;
    } catch {
      /* Network failures have no response body. */
    }
    throw new TrialError(message, status);
  }
  return data as T;
}
