// Serves a small set of optional "warm-up" questions to the student Questions page. The question
// bank lives in an admin-only table (answers must not leak wholesale to the client), so this
// function reads it with the service role and returns only what a warm-up needs — the question plus,
// for the on-demand reveal, the answer and model reasoning. Only questions flagged warmup+active are
// eligible, so an admin can keep any question exclusive to live interviews.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "X-Content-Type-Options": "nosniff",
  "Cache-Control": "no-store",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const token = (req.headers.get("Authorization") || "").replace("Bearer ", "");
    const authClient = createClient(supabaseUrl, supabaseAnonKey);
    const { data: userData, error: userErr } = await authClient.auth.getUser(token);
    if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const subject: string | undefined = body?.subject && body.subject !== "mixed" ? body.subject : undefined;
    const limit = Math.min(Math.max(Number(body?.limit) || 5, 1), 10);

    const admin = createClient(supabaseUrl, supabaseServiceKey);
    let q = admin.from("questions").select(
      "id, subject, topic, question_type, difficulty, title, question, answer, model_reasoning_path, hints",
    ).eq("active", true).eq("warmup", true);
    if (subject) q = q.eq("subject", subject);
    const { data, error } = await q;
    if (error) return json({ error: error.message }, 500);

    // Shuffle server-side and take `limit` so each warm-up feels fresh.
    const pool = (data ?? []).slice();
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const questions = pool.slice(0, limit).map((r: any) => ({
      id: r.id, subject: r.subject, topic: r.topic, questionType: r.question_type,
      difficulty: r.difficulty, title: r.title, question: r.question,
      answer: r.answer, modelReasoningPath: r.model_reasoning_path,
      firstHint: Array.isArray(r.hints) && r.hints.length ? r.hints[0] : null,
    }));
    return json({ questions });
  } catch (err) {
    console.error("warmup-questions error:", (err as Error)?.message || err);
    return json({ error: "Internal server error" }, 500);
  }
});
