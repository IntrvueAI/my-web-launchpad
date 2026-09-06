// Canonical source for the server-side app_logs writer, vendored into every edge function's own
// `_shared/` directory (see scripts/build-interview-brain.mjs and scripts/vendor-app-logger.mjs —
// this file is never deployed on its own, hence the `_shared-src` underscore prefix keeping it out
// of Supabase's function discovery). Fire-and-forget: a logging failure must never affect the
// caller's actual response, so every failure here is swallowed after a console.error.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

export type AppLogLevel = "info" | "warn" | "error";

export interface LogAppEventArgs {
  level?: AppLogLevel;
  eventType: string;
  message: string;
  userId?: string | null;
  interviewSessionId?: string | null;
  requestId?: string | null;
  metadata?: Record<string, unknown>;
}

let adminClient: ReturnType<typeof createClient> | null = null;
function getAdminClient() {
  if (!adminClient) {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    adminClient = createClient(supabaseUrl, supabaseServiceKey);
  }
  return adminClient;
}

/** `source` should be `edge:<function-name>` (e.g. "edge:interview-brain"). */
export async function logAppEvent(source: string, args: LogAppEventArgs): Promise<void> {
  try {
    const { error } = await getAdminClient().from("app_logs").insert({
      level: args.level ?? "error",
      source,
      event_type: args.eventType,
      message: args.message,
      user_id: args.userId ?? null,
      interview_session_id: args.interviewSessionId ?? null,
      request_id: args.requestId ?? null,
      metadata: args.metadata ?? {},
    });
    if (error) console.error(`logAppEvent insert failed (${source}):`, error.message);
  } catch (err) {
    console.error(`logAppEvent failed (${source}):`, (err as Error)?.message || err);
  }
}
