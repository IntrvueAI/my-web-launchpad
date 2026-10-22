// 11+ beta invitations in isolated PostgreSQL: products are kept apart on the server, Medicine
// invitations keep their rules, and the founder inbox filters by product. Never touches production.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const { PGlite } = await import(
  process.env.PGLITE_MODULE || "@electric-sql/pglite"
);
const db = new PGlite();
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const owner = id(1), schoolGuest = id(2), medicineGuest = id(3);
const schoolInvite = id(10), medicineInvite = id(11), schoolTrial = id(20), medicineTrial = id(21);
let checks = 0;
const eq = (a, b) => {
  assert.deepEqual(a, b);
  checks++;
};
const reject = async (fn, pattern) => {
  await assert.rejects(fn, pattern);
  checks++;
};
const migration = (name) => readFile(new URL(`../supabase/migrations/${name}`, import.meta.url), "utf8");
const asGuest = async (user, trial) => {
  await db.exec("RESET ROLE; SET ROLE authenticated");
  await db.query("SELECT set_config('request.jwt.claims',$1,false)", [
    JSON.stringify({ sub: user, role: "authenticated", app_metadata: { mmi_guest_trial: trial } }),
  ]);
};
const asServer = async () => {
  await db.exec("RESET ROLE");
  await db.query("SELECT set_config('request.jwt.claims','',false)");
};
const inbox = async (product) =>
  (await db.query("SELECT get_mmi_feedback_inbox($1,'','all','',NULL,1,$2) AS result", [owner, product])).rows[0].result;
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
    CREATE TABLE public.feedback(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid REFERENCES auth.users ON DELETE CASCADE,
      session_reference text,interview_type text,total_score integer,created_at timestamptz DEFAULT now(),detailed_feedback jsonb,transcription text);
    ALTER TABLE public.interview_sessions ENABLE ROW LEVEL SECURITY; ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
    CREATE POLICY own_sessions ON public.interview_sessions TO authenticated USING(user_id=auth.uid()) WITH CHECK(user_id=auth.uid());
    CREATE POLICY own_feedback ON public.feedback TO authenticated USING(user_id=auth.uid()) WITH CHECK(user_id=auth.uid());
    GRANT SELECT,INSERT,UPDATE ON public.interview_sessions TO authenticated;
    GRANT SELECT,INSERT,UPDATE,DELETE ON public.feedback TO authenticated;
  `);
  for (const name of [
    "20261001000001_mmi_guest_trials.sql",
    "20261001000002_mmi_beta_links.sql",
    "20261001000003_mmi_feedback_inbox.sql",
    "20261005000001_mmi_practice_mock.sql",
  ])
    await db.exec(await migration(name));
  const school = await migration("20261022000001_school_guest_trials.sql");
  // An invitation created before this release must stay a Medicine invitation.
  await db.query("INSERT INTO auth.users VALUES($1),($2),($3)", [owner, schoolGuest, medicineGuest]);
  await db.query(
    "INSERT INTO mmi_trial_invites(id,owner_id,label,expires_at,max_guests,max_interviews) VALUES($1,$2,'Earlier Medicine link',now()+interval '7 days',1,2)",
    [medicineInvite, owner],
  );
  await db.exec(school);
  await db.exec(school);
  checks++;
  eq((await db.query("SELECT product FROM mmi_trial_invites WHERE id=$1", [medicineInvite])).rows[0].product, "medicine");
  await reject(
    () => db.query("INSERT INTO mmi_trial_invites(owner_id,label,expires_at,product) VALUES($1,'Bad',now()+interval '1 day','other')", [owner]),
    /mmi_trial_invites_product_check/,
  );
  await db.query(
    "INSERT INTO mmi_trial_invites(id,owner_id,label,expires_at,max_guests,max_interviews,product) VALUES($1,$2,'11+ parent preview',now()+interval '7 days',1,2,'11plus')",
    [schoolInvite, owner],
  );
  await db.query(
    "INSERT INTO mmi_guest_trials(id,invite_id,guest_user_id,display_name,client_nonce,expires_at) VALUES($1,$2,$3,'Amelia',gen_random_uuid(),now()+interval '6 hours'),($4,$5,$6,'Priya',gen_random_uuid(),now()+interval '6 hours')",
    [schoolTrial, schoolInvite, schoolGuest, medicineTrial, medicineInvite, medicineGuest],
  );

  // Guests can only start their own product's interviews.
  await asGuest(schoolGuest, schoolTrial);
  await db.query("INSERT INTO interview_sessions(id,user_id,session_reference,interview_type) VALUES($1,$2,'school-1','11-plus')", [id(30), schoolGuest]);
  checks++;
  await reject(
    () => db.query("INSERT INTO interview_sessions(user_id,session_reference,interview_type) VALUES($1,'school-2','medicine-ethics-practice')", [schoolGuest]),
    /Invalid guest interview/,
  );
  await reject(
    () => db.query("INSERT INTO interview_sessions(user_id,session_reference,interview_type) VALUES($1,'school-3','11-plus-v2')", [schoolGuest]),
    /Invalid guest interview/,
  );
  await asGuest(medicineGuest, medicineTrial);
  await reject(
    () => db.query("INSERT INTO interview_sessions(user_id,session_reference,interview_type) VALUES($1,'med-1','maths-interview')", [medicineGuest]),
    /Invalid guest interview/,
  );
  await db.query("INSERT INTO interview_sessions(id,user_id,session_reference,interview_type) VALUES($1,$2,'med-2','medicine-mmi-practice')", [id(31), medicineGuest]);
  checks++;

  // Server authorisation reports the product and enforces the same boundary.
  await asServer();
  const run = (await db.query("SELECT authorize_mmi_guest_run($1,$2,'token') AS result", [schoolGuest, id(30)])).rows[0].result;
  eq([run.product, run.interview_type], ["11plus", "11-plus"]);
  eq((await db.query("SELECT interviews_started FROM mmi_guest_trials WHERE id=$1", [schoolTrial])).rows[0].interviews_started, 1);
  await db.query("INSERT INTO interview_sessions(id,user_id,session_reference,interview_type) VALUES($1,$2,'school-forged','medicine-data-practice')", [id(32), schoolGuest]);
  await reject(() => db.query("SELECT authorize_mmi_guest_run($1,$2,'token')", [schoolGuest, id(32)]), /covers 11\+ interviews only/);
  eq((await db.query("SELECT authorize_mmi_guest_run($1,$2,'brain') AS result", [medicineGuest, id(31)])).rows[0].result.product, "medicine");

  // Status tells each guest page which brand and catalogue to show.
  eq((await db.query("SELECT get_mmi_guest_trial_status($1) AS result", [schoolGuest])).rows[0].result.product, "11plus");
  eq((await db.query("SELECT get_mmi_guest_trial_status($1) AS result", [medicineGuest])).rows[0].result.product, "medicine");

  // The founder inbox separates products; omitting the product keeps the previous behaviour.
  await db.query(
    "INSERT INTO feedback(user_id,session_reference,interview_type,total_score,detailed_feedback) VALUES($1,'school-1','11-plus',14,'{\"overall\":\"Clear reasons\"}'),($2,'med-2','medicine-mmi-practice',12,'{}')",
    [schoolGuest, medicineGuest],
  );
  const schoolInbox = await inbox("11plus");
  eq(schoolInbox.trials.map((t) => [t.display_name, t.product]), [["Amelia", "11plus"]]);
  eq(schoolInbox.trials[0].interviews.map((i) => [i.interview_type, i.total_score]), [["11-plus", 14]]);
  eq((await inbox("medicine")).trials.map((t) => t.display_name), ["Priya"]);
  eq((await inbox(null)).summary.testers, 2);
  await reject(() => inbox("other"), /Invalid feedback filter/);

  // Only the server role can call the changed functions; the old inbox signature is gone.
  for (const [fn, roles] of [
    ["get_mmi_feedback_inbox(uuid,text,text,text,uuid,integer,text)", ["service_role"]],
    ["mmi_guest_interview_types(text)", []],
    ["get_mmi_guest_trial_status(uuid)", ["service_role"]],
  ])
    for (const role of ["anon", "authenticated", "service_role"])
      eq(
        (await db.query("SELECT has_function_privilege($1,$2,'EXECUTE') AS ok", [role, fn])).rows[0].ok,
        roles.includes(role),
      );
  eq(
    (await db.query("SELECT count(*)::int AS n FROM pg_proc WHERE proname='get_mmi_feedback_inbox'")).rows[0].n,
    1,
  );
  console.log(`PASS: ${checks} 11+ guest trial checks: product boundaries, Medicine compatibility, product inbox, privileges, repeatable.`);
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
