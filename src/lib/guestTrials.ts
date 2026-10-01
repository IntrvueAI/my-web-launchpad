import { guestSupabase, supabase } from "@/integrations/supabase/client";
export const GUEST_INTERVIEW_IDS = [
  "medicine-ethics-practice",
  "medicine-roleplay-practice",
  "medicine-motivation-practice",
  "medicine-data-practice",
  "medicine-mmi",
  "medicine-mmi-manchester",
  "medicine-oxford-pilot",
  "medicine-cambridge-pilot",
  "medicine-imperial-pilot",
] as const;
export interface TrialInvite {
  id: string;
  label: string;
  expires_at: string;
  revoked_at: string | null;
  max_guests: number;
  max_interviews: number;
  guest_hours: number;
  code: string;
}
export interface TrialStatus {
  name: string;
  expiresAt: string;
  remaining: number;
  maxInterviews: number;
}
export interface TrialGuest {
  id: string;
  display_name: string;
  guest_user_id: string | null;
  created_at: string;
  expires_at: string;
}
export interface TrialFeedback {
  id: string;
  user_id: string;
  interview_type: string;
  total_score: number | null;
  created_at: string;
  detailed_feedback: Record<string, string> | null;
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
