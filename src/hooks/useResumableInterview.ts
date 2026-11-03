import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

/** Matches the server, which treats an interview idle for 15 minutes as abandoned. */
export const RESUME_WINDOW_MS = 15 * 60 * 1000;

export interface ResumableInterview {
  id: string;
  reference: string;
  interviewType: string;
  lastActivityAt: string;
  /** Clara had already finished: reopening it restores the transcript for feedback. */
  finished: boolean;
}

/**
 * An interview this account started that is still open on the server (for example after the page
 * was refreshed mid-interview), recent enough to rejoin where it left off.
 */
export function useResumableInterview(enabled = true) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["resumable-interview", user?.id],
    enabled: !!user && enabled,
    staleTime: 0,
    queryFn: async (): Promise<ResumableInterview | null> => {
      const since = new Date(Date.now() - RESUME_WINDOW_MS).toISOString();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("interview_sessions")
        .select("id, session_reference, interview_type, last_activity_at, done:engine_state->done")
        .eq("user_id", user!.id)
        .eq("status", "active")
        .not("engine_state", "is", null)
        .gte("last_activity_at", since)
        .order("last_activity_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return { id: data.id, reference: data.session_reference, interviewType: data.interview_type, lastActivityAt: data.last_activity_at, finished: data.done === true };
    },
  });
}
