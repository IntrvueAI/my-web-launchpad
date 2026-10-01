// Isolated PostgreSQL checks. This script never connects to a real Supabase project.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const { PGlite } = await import(
  process.env.PGLITE_MODULE || "@electric-sql/pglite"
);
const db = new PGlite();
const owner = "11111111-1111-4111-8111-111111111111";
const guest = "22222222-2222-4222-8222-222222222222";
const stranger = "33333333-3333-4333-8333-333333333333";
const invite = "44444444-4444-4444-8444-444444444444";
const nonce = "55555555-5555-4555-8555-555555555555";
const sid = "66666666-6666-4666-8666-666666666666";
let checks = 0;
const eq = (a, b) => {
  assert.deepEqual(a, b);
  checks++;
};
const reject = async (fn, pattern) => {
  await assert.rejects(fn, pattern);
  checks++;
};
const value = async (sql, params = []) =>
  (await db.query(sql, params)).rows[0].result;
try {
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE SCHEMA auth;
    CREATE TABLE auth.users(id uuid PRIMARY KEY);
    CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$ SELECT coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT (auth.jwt()->>'sub')::uuid $$;
    GRANT USAGE ON SCHEMA auth,public TO authenticated,anon,service_role;
    CREATE TABLE public.interview_sessions(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid REFERENCES auth.users ON DELETE CASCADE,
      session_reference text UNIQUE,interview_type text NOT NULL,status text DEFAULT 'active',engine_state jsonb,engine_revision integer DEFAULT 0,
      started_at timestamptz DEFAULT now(),ended_at timestamptz,last_activity_at timestamptz DEFAULT now(),
      session_metadata jsonb,error_logs jsonb,created_at timestamptz DEFAULT now(),updated_at timestamptz DEFAULT now());
    CREATE TABLE public.feedback(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid REFERENCES auth.users ON DELETE CASCADE,total_score integer);
    ALTER TABLE public.interview_sessions ENABLE ROW LEVEL SECURITY; ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
    CREATE POLICY own_sessions ON public.interview_sessions TO authenticated USING(user_id=auth.uid()) WITH CHECK(user_id=auth.uid());
    CREATE POLICY own_feedback ON public.feedback TO authenticated USING(user_id=auth.uid()) WITH CHECK(user_id=auth.uid());
    GRANT SELECT,INSERT,UPDATE ON public.interview_sessions TO authenticated;
    GRANT SELECT,INSERT,UPDATE,DELETE ON public.feedback TO authenticated;
  `);
  const migration = await readFile(
    new URL(
      "../supabase/migrations/20261001000001_mmi_guest_trials.sql",
      import.meta.url,
    ),
    "utf8",
  );
  await db.exec(migration);
  await db.exec(migration);
  checks++;
  for (const role of ["anon", "authenticated"]) {
    for (const fn of [
      "reserve_mmi_guest_trial(uuid,text,uuid)",
      "authorize_mmi_guest_run(uuid,uuid,text)",
    ]) {
      eq(
        await value(
          "SELECT has_function_privilege($1,$2,'EXECUTE') AS result",
          [role, fn],
        ),
        false,
      );
    }
    for (const table of [
      "mmi_trial_invites",
      "mmi_guest_trials",
      "mmi_guest_runs",
    ]) {
      eq(
        await value("SELECT has_table_privilege($1,$2,'SELECT') AS result", [
          role,
          table,
        ]),
        false,
      );
      eq(
        await value("SELECT has_table_privilege($1,$2,'INSERT') AS result", [
          role,
          table,
        ]),
        false,
      );
    }
  }
  await db.query("INSERT INTO auth.users VALUES($1),($2),($3)", [
    owner,
    guest,
    stranger,
  ]);
  await db.query(
    "INSERT INTO mmi_trial_invites(id,owner_id,label,expires_at,max_guests,max_interviews) VALUES($1,$2,'Test',now()+interval '1 day',1,1)",
    [invite, owner],
  );
  const reserve = (n = nonce, name = "Guest Name") =>
    value("SELECT reserve_mmi_guest_trial($1,$2,$3) AS result", [
      invite,
      name,
      n,
    ]);
  const trial = await reserve();
  eq(trial.display_name, "Guest Name");
  eq((await reserve()).id, trial.id);
  await reject(() => reserve(nonce, "Different Name"), /cannot be resumed/);
  await reject(() => reserve(crypto.randomUUID()), /guest limit/);
  eq(
    await value("SELECT count(*)::integer AS result FROM mmi_guest_trials"),
    1,
  );
  await db.query("UPDATE mmi_guest_trials SET guest_user_id=$1 WHERE id=$2", [
    guest,
    trial.id,
  ]);
  await db.query(
    "INSERT INTO interview_sessions(id,user_id,session_reference,interview_type) VALUES($1,$2,'test','medicine-ethics-practice')",
    [sid, guest],
  );
  const authorize = (kind = "token", who = guest, id = sid) =>
    value("SELECT authorize_mmi_guest_run($1,$2,$3) AS result", [
      who,
      id,
      kind,
    ]);
  await reject(() => authorize("feedback"), /Start an interview/);
  await reject(() => authorize("token", stranger), /expired/);
  await reject(
    () => authorize("token", guest, crypto.randomUUID()),
    /owned trial/,
  );
  await reject(() => authorize("invalid"), /Unsupported/);
  for (let i = 0; i < 3; i++) eq((await authorize()).trial_id, trial.id);
  await reject(() => authorize(), /connection retry limit/);
  eq((await authorize("brain")).interview_type, "medicine-ethics-practice");
  await db.query(
    "UPDATE mmi_guest_runs SET brain_requests=120, feedback_requests=5 WHERE session_id=$1",
    [sid],
  );
  await reject(() => authorize("brain"), /conversation limit/);
  await reject(() => authorize("feedback"), /feedback retry limit/);
  await db.query(
    "UPDATE mmi_guest_runs SET brain_requests=1,feedback_requests=0 WHERE session_id=$1",
    [sid],
  );
  const extra = crypto.randomUUID();
  await db.query(
    "INSERT INTO interview_sessions(id,user_id,interview_type) VALUES($1,$2,'medicine-cambridge-pilot')",
    [extra, guest],
  );
  await reject(() => authorize("token", guest, extra), /used the interviews/);
  await db.query(
    "UPDATE interview_sessions SET interview_type='11-plus' WHERE id=$1",
    [sid],
  );
  await reject(() => authorize("brain"), /Medicine interviews only/);
  await db.query(
    "UPDATE interview_sessions SET interview_type='medicine-cambridge-pilot',status='completed' WHERE id=$1",
    [sid],
  );
  await reject(() => authorize("brain"), /has ended/);
  eq((await authorize("feedback")).trial_id, trial.id);
  await db.query("UPDATE mmi_trial_invites SET revoked_at=now() WHERE id=$1", [
    invite,
  ]);
  await reject(() => authorize("feedback"), /invitation has been closed/);
  await reject(() => reserve(), /expired or been closed/);
  await db.query("UPDATE mmi_trial_invites SET revoked_at=null WHERE id=$1", [
    invite,
  ]);
  await db.query(
    "UPDATE mmi_guest_trials SET expires_at=now()-interval '1 second' WHERE id=$1",
    [trial.id],
  );
  await reject(() => authorize("feedback"), /trial has expired/);
  await db.query(
    "UPDATE mmi_guest_trials SET expires_at=now()+interval '1 hour' WHERE id=$1",
    [trial.id],
  );

  // Exercise the actual RLS and trigger as a guest, then as an ordinary customer.
  await db.query("SELECT set_config('request.jwt.claims',$1,false)", [
    JSON.stringify({ sub: guest, app_metadata: { mmi_guest_trial: trial.id } }),
  ]);
  await db.exec("SET ROLE authenticated");
  await reject(
    () =>
      db.query("INSERT INTO feedback(user_id,total_score) VALUES($1,20)", [
        guest,
      ]),
    /row-level security/,
  );
  await reject(
    () =>
      db.query("UPDATE interview_sessions SET engine_state='{}' WHERE id=$1", [
        sid,
      ]),
    /managed by the server/,
  );
  await reject(
    () =>
      db.query("UPDATE interview_sessions SET status='active' WHERE id=$1", [
        sid,
      ]),
    /managed by the server/,
  );
  await reject(
    () =>
      db.query(
        "UPDATE interview_sessions SET interview_type='medicine-oxford-pilot' WHERE id=$1",
        [sid],
      ),
    /managed by the server/,
  );
  await reject(
    () =>
      db.query(
        "INSERT INTO interview_sessions(user_id,interview_type) VALUES($1,'11-plus')",
        [guest],
      ),
    /Invalid guest interview/,
  );
  await reject(
    () =>
      db.query(
        "INSERT INTO interview_sessions(user_id,interview_type,engine_state) VALUES($1,'medicine-mmi','{}')",
        [guest],
      ),
    /Invalid guest interview/,
  );
  await db.query(
    "INSERT INTO interview_sessions(user_id,interview_type) VALUES($1,'medicine-oxford-pilot')",
    [guest],
  );
  checks++;
  await db.query(
    "UPDATE interview_sessions SET last_activity_at=now() WHERE id=$1",
    [sid],
  );
  checks++;
  await db.exec("RESET ROLE");
  await db.query(
    "INSERT INTO feedback(user_id,total_score) VALUES($1,12),($2,13)",
    [owner, guest],
  );
  await db.exec("SET ROLE authenticated");
  eq(await value("SELECT count(*)::integer AS result FROM feedback"), 1);
  await db.query("UPDATE feedback SET total_score=20");
  eq(await value("SELECT total_score AS result FROM feedback"), 13);
  await db.query("DELETE FROM feedback");
  eq(await value("SELECT count(*)::integer AS result FROM feedback"), 1);
  await db.exec("RESET ROLE");
  await db.query("SELECT set_config('request.jwt.claims',$1,false)", [
    JSON.stringify({ sub: owner, app_metadata: {} }),
  ]);
  await db.exec("SET ROLE authenticated");
  await db.query("INSERT INTO feedback(user_id,total_score) VALUES($1,14)", [
    owner,
  ]);
  checks++;
  await db.query(
    "INSERT INTO interview_sessions(user_id,interview_type) VALUES($1,'11-plus')",
    [owner],
  );
  checks++;
  await db.exec("RESET ROLE");
  await db.query("DELETE FROM auth.users WHERE id=$1", [guest]);
  eq(
    await value("SELECT count(*)::integer AS result FROM mmi_guest_trials"),
    1,
  );
  eq(
    await value("SELECT interviews_started AS result FROM mmi_guest_trials"),
    1,
  );
  eq(await value("SELECT guest_user_id AS result FROM mmi_guest_trials"), null);
  await reject(() => reserve(crypto.randomUUID()), /guest limit/);
  console.log(`${checks} guest trial database checks passed`);
} finally {
  await db.close();
}
