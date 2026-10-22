// Medicine credits in isolated PostgreSQL: separate balances, one charge per session, refunds
// only before Clara starts, server-only interview state and unchanged 11+ settlement.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const { PGlite } = await import(
  process.env.PGLITE_MODULE || "@electric-sql/pglite"
);
const db = new PGlite();
const admin = "00000000-0000-4000-8000-000000000001";
const student = "00000000-0000-4000-8000-000000000002";
const other = "00000000-0000-4000-8000-000000000003";
let checks = 0;
const eq = (a, b) => {
  assert.deepEqual(a, b);
  checks++;
};
const reject = async (fn, pattern) => {
  await assert.rejects(fn, pattern);
  checks++;
};
const as = async (role, id = "") => {
  await db.exec(`RESET ROLE; SET ROLE ${role}`);
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [id]);
};
const one = async (sql, params = []) => (await db.query(sql, params)).rows[0];
const medicineBalance = async (id) => (await one("SELECT credits FROM medicine_credit_balances WHERE user_id=$1", [id]))?.credits ?? 0;
const schoolBalance = async (id) => (await one("SELECT credits FROM credits_balance WHERE user_id=$1", [id]))?.credits ?? 0;
const settle = async (session, amount, credits) => (await one("SELECT settle_checkout_payment($1,$2,'gbp',$3,$4) AS r", [session, amount, student, credits])).r;
const charge = async (id, cost) => (await one("SELECT charge_medicine_session($1,$2) AS r", [id, cost])).r;
const newSession = async (type, ref) => (await one(
  "INSERT INTO interview_sessions(session_reference,user_id,interview_type) VALUES($1,$2,$3) RETURNING id", [ref, student, type])).id;

try {
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    CREATE FUNCTION public.is_current_user_admin() RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT auth.uid() = '${admin}'::uuid $$;
    GRANT USAGE ON SCHEMA public,auth TO authenticated,anon,service_role;
    INSERT INTO auth.users VALUES('${admin}'),('${student}'),('${other}');
    CREATE TABLE credits_balance(user_id uuid PRIMARY KEY, credits integer NOT NULL DEFAULT 0, updated_at timestamptz DEFAULT now());
    CREATE TABLE orders(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, stripe_session_id text UNIQUE,
      amount integer NOT NULL, currency text NOT NULL DEFAULT 'gbp', credits_purchased integer NOT NULL DEFAULT 0,
      status text NOT NULL DEFAULT 'pending', metadata jsonb DEFAULT '{}', created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now());
    CREATE TABLE interview_sessions(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), session_reference text UNIQUE NOT NULL,
      user_id uuid REFERENCES auth.users(id), interview_type text NOT NULL, status text NOT NULL DEFAULT 'active',
      ended_at timestamptz, last_activity_at timestamptz DEFAULT now(), engine_state jsonb, engine_revision integer NOT NULL DEFAULT 0,
      transcript text);
    ALTER TABLE interview_sessions ENABLE ROW LEVEL SECURITY;
    CREATE POLICY own_select ON interview_sessions FOR SELECT USING (auth.uid() = user_id);
    CREATE POLICY own_insert ON interview_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
    CREATE POLICY own_update ON interview_sessions FOR UPDATE USING (auth.uid() = user_id);
    GRANT SELECT, INSERT, UPDATE ON interview_sessions TO authenticated;
    GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;`);
  const sql = await readFile(new URL("../supabase/migrations/20261022000003_medicine_credits.sql", import.meta.url), "utf8");
  await db.exec(sql);
  await db.exec(sql);
  checks++;
  await db.exec("GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role");

  // Browsers read only their own balance and cannot mint credits or call the charging functions.
  await as("anon");
  await reject(() => db.query("SELECT * FROM medicine_credit_balances"), /permission denied/);
  await as("authenticated", student);
  eq((await db.query("SELECT * FROM medicine_credit_balances")).rows, []);
  await reject(() => db.query("INSERT INTO medicine_credit_balances(user_id,credits) VALUES($1,99)", [student]), /permission denied/);
  await reject(() => db.query("SELECT charge_medicine_session(gen_random_uuid(),1)"), /permission denied/);
  await reject(() => db.query("SELECT adjust_medicine_credits_atomic($1,'add',5)", [student]), /permission denied/);
  await reject(() => db.query("SELECT settle_checkout_payment('cs_x',699,'gbp')"), /permission denied/);

  // Interview state belongs to the server: no forged state, no relabelled type, no reopening.
  await reject(() => db.query("INSERT INTO interview_sessions(session_reference,user_id,interview_type,engine_state) VALUES('F1',$1,'medicine-data-practice','{}')", [student]), /managed by the server/);
  const free = await newSession("medicine-ethics-practice", "E1");
  await reject(() => db.query("UPDATE interview_sessions SET interview_type='medicine-mmi-practice' WHERE id=$1", [free]), /managed by the server/);
  await reject(() => db.query("UPDATE interview_sessions SET engine_state='{\"done\":false}' WHERE id=$1", [free]), /managed by the server/);
  await db.query("UPDATE interview_sessions SET last_activity_at=now(), transcript='hello' WHERE id=$1", [free]);
  await db.query("UPDATE interview_sessions SET status='completed', ended_at=now() WHERE id=$1", [free]);
  await reject(() => db.query("UPDATE interview_sessions SET status='active' WHERE id=$1", [free]), /managed by the server/);
  const mini = await newSession("medicine-roleplay-practice", "R1");
  const full = await newSession("medicine-mmi-practice", "M1");
  const school = await newSession("11-plus", "S1");

  // Settlement fills the balance the order was bought for; repeats never double-credit.
  await as("service_role");
  await db.query("INSERT INTO credits_balance(user_id,credits) VALUES($1,3)", [student]);
  await db.query("INSERT INTO orders(user_id,stripe_session_id,amount,credits_purchased,platform) VALUES($1,'cs_med',3499,6,'medicine')", [student]);
  await db.query("INSERT INTO orders(user_id,stripe_session_id,amount,credits_purchased) VALUES($1,'cs_11',1999,2)", [student]);
  eq((await one("SELECT platform FROM orders WHERE stripe_session_id='cs_11'")).platform, "11plus");
  const paid = await settle("cs_med", 3499, 6);
  eq([paid.credits_added, paid.balance, paid.platform], [6, 6, "medicine"]);
  eq((await settle("cs_med", 3499, 6)).alreadyProcessed, true);
  eq([await medicineBalance(student), await schoolBalance(student)], [6, 3]);
  const schoolPaid = await settle("cs_11", 1999, 2);
  eq([schoolPaid.balance, schoolPaid.platform, await medicineBalance(student)], [5, "11plus", 6]);
  await reject(() => settle("cs_med", 699, 6), /does not match/);
  await reject(() => db.query("INSERT INTO orders(user_id,stripe_session_id,amount,credits_purchased,platform) VALUES($1,'cs_bad',1,1,'chess')", [student]), /check constraint/);

  // One charge per session, never below zero, Medicine sessions only.
  eq((await charge(mini, 1)), { ok: true, alreadyCharged: false, charged: 1, balance: 5 });
  eq((await charge(mini, 1)), { ok: true, alreadyCharged: true, charged: 1, balance: 5 });
  eq((await charge(full, 6)), { ok: false, reason: "insufficient", balance: 5, cost: 6 });
  await reject(() => charge(school, 3), /Medicine session not found/);
  await reject(() => charge(mini, 0), /Invalid Medicine charge/);
  eq(await schoolBalance(student), 5);

  // Ending before Clara starts returns the credit once; the session cannot be charged again.
  await as("authenticated", student);
  await db.query("UPDATE interview_sessions SET status='error', ended_at=now() WHERE id=$1", [mini]);
  await as("service_role");
  eq(await medicineBalance(student), 6);
  eq((await one("SELECT count(*)::int AS n FROM medicine_credit_ledger WHERE session_id=$1 AND reason='refund'", [mini])).n, 1);
  eq((await charge(mini, 1)).reason, "closed");
  eq(await medicineBalance(student), 6);

  // Once the brain has started, ending the interview keeps the charge.
  eq((await charge(full, 6)).balance, 0);
  await db.query("UPDATE interview_sessions SET engine_state='{\"done\":false}', engine_revision=1 WHERE id=$1", [full]);
  await as("authenticated", student);
  await db.query("UPDATE interview_sessions SET status='error', ended_at=now() WHERE id=$1", [full]);
  await as("service_role");
  eq(await medicineBalance(student), 0);

  // Administrators adjust balances with an audit row; removal stops at zero.
  eq((await one("SELECT adjust_medicine_credits_atomic($1,'add',2,'Dropped connection') AS r", [student])).r, { previous_balance: 0, new_balance: 2 });
  eq((await one("SELECT adjust_medicine_credits_atomic($1,'remove',5) AS r", [student])).r.new_balance, 0);
  eq((await db.query("SELECT reason, delta FROM medicine_credit_ledger WHERE user_id=$1 ORDER BY id", [student])).rows.map((r) => `${r.reason}:${r.delta}`),
    ["purchase:6", "interview:-1", "refund:1", "interview:-6", "admin:2", "admin:-2"]);

  // History is private to its owner and visible to administrators.
  await as("authenticated", other);
  eq((await db.query("SELECT * FROM medicine_credit_ledger")).rows.length, 0);
  await as("authenticated", student);
  eq((await db.query("SELECT * FROM medicine_credit_ledger")).rows.length, 6);
  await reject(() => db.query("UPDATE medicine_credit_ledger SET delta=100"), /permission denied/);
  await as("authenticated", admin);
  eq((await db.query("SELECT user_id FROM medicine_credit_balances")).rows.length, 1);
  console.log(`PASS: ${checks} Medicine credit checks: separate balances, one charge per session, refunds before start only, server-only interview state, 11+ settlement unchanged, repeatable.`);
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
