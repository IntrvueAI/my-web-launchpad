// Run against an isolated in-memory PostgreSQL database; never connect to a real project.
// Install @electric-sql/pglite locally, or set PGLITE_MODULE to its absolute module URL.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const { PGlite } = await import(
  process.env.PGLITE_MODULE || "@electric-sql/pglite"
);
const db = new PGlite();
const user = "11111111-1111-4111-8111-111111111111";
const another = "22222222-2222-4222-8222-222222222222";
let checks = 0;
const check = (actual, expected) => {
  assert.deepEqual(actual, expected);
  checks++;
};
try {
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE TABLE credits_balance(user_id uuid PRIMARY KEY, credits integer NOT NULL DEFAULT 0, updated_at timestamptz DEFAULT now());
    CREATE TABLE orders(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL,stripe_session_id text UNIQUE,
      amount integer NOT NULL,currency text NOT NULL,credits_purchased integer NOT NULL,status text DEFAULT 'pending',updated_at timestamptz DEFAULT now());
    ALTER TABLE credits_balance ENABLE ROW LEVEL SECURITY;
    ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
    CREATE POLICY insert_own_credits ON credits_balance FOR INSERT WITH CHECK (true);
    CREATE POLICY update_own_credits ON credits_balance FOR UPDATE USING (true);
    CREATE POLICY "Users can create their own orders" ON orders FOR INSERT WITH CHECK (true);
  `);
  const migration = await readFile(
    new URL(
      "../supabase/migrations/20260917000001_backend_payment_integrity.sql",
      import.meta.url,
    ),
    "utf8",
  );
  await db.exec(migration);
  await db.exec(migration);
  checks++; // Migration replay must remain safe.
  check(
    (await db.query("SELECT count(*)::integer AS n FROM pg_policies")).rows[0]
      .n,
    0,
  );
  check(
    (
      await db.query(
        "SELECT has_function_privilege('authenticated','settle_checkout_payment(text,integer,text,uuid,integer)','EXECUTE') AS allowed",
      )
    ).rows[0].allowed,
    false,
  );
  check(
    (
      await db.query(
        "SELECT has_function_privilege('service_role','settle_checkout_payment(text,integer,text,uuid,integer)','EXECUTE') AS allowed",
      )
    ).rows[0].allowed,
    true,
  );
  check(
    (
      await db.query(
        "SELECT has_function_privilege('authenticated','adjust_credits_atomic(uuid,text,integer)','EXECUTE') AS allowed",
      )
    ).rows[0].allowed,
    false,
  );
  await db.query(
    "INSERT INTO orders(user_id,stripe_session_id,amount,currency,credits_purchased) VALUES($1,'cs_one',1999,'gbp',2)",
    [user],
  );
  const settle = (
    id = "cs_one",
    amount = 1999,
    currency = "gbp",
    owner = user,
    credits = 2,
  ) =>
    db
      .query("SELECT settle_checkout_payment($1,$2,$3,$4,$5) AS result", [
        id,
        amount,
        currency,
        owner,
        credits,
      ])
      .then((x) => x.rows[0].result);
  check(await settle(), {
    ok: true,
    alreadyProcessed: false,
    credits_added: 2,
    balance: 2,
  });
  check(await settle(), {
    ok: true,
    alreadyProcessed: true,
    credits_added: 0,
    balance: 2,
  });
  for (const args of [
    ["cs_one", 1],
    ["cs_one", 1999, "usd"],
    ["cs_one", 1999, "gbp", another],
    ["cs_one", 1999, "gbp", user, 500],
    ["cs_missing"],
  ]) {
    await assert.rejects(() => settle(...args));
    checks++;
  }
  check(
    (
      await db.query("SELECT credits FROM credits_balance WHERE user_id=$1", [
        user,
      ])
    ).rows[0].credits,
    2,
  );
  await db.query(
    "INSERT INTO orders(user_id,stripe_session_id,amount,currency,credits_purchased,status) VALUES($1,'cs_retry',2999,'gbp',3,'failed')",
    [user],
  );
  check((await settle("cs_retry", 2999, "gbp", user, 3)).balance, 5);
  check((await settle("cs_retry", 2999, "gbp", user, 3)).credits_added, 0);
  // Inject a database write failure after the balance change. PostgreSQL must roll it all back.
  await db.exec(
    "CREATE FUNCTION fail_paid_order() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.stripe_session_id='cs_rollback' AND NEW.status='paid' THEN RAISE EXCEPTION 'injected write failure'; END IF; RETURN NEW; END; $$; CREATE TRIGGER fail_order BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION fail_paid_order();",
  );
  await db.query(
    "INSERT INTO orders(user_id,stripe_session_id,amount,currency,credits_purchased) VALUES($1,'cs_rollback',1999,'gbp',2)",
    [user],
  );
  await assert.rejects(() => settle("cs_rollback"));
  checks++;
  check(
    (
      await db.query("SELECT credits FROM credits_balance WHERE user_id=$1", [
        user,
      ])
    ).rows[0].credits,
    5,
  );
  check(
    (
      await db.query(
        "SELECT status FROM orders WHERE stripe_session_id='cs_rollback'",
      )
    ).rows[0].status,
    "pending",
  );
  await db.exec("DROP TRIGGER fail_order ON orders");
  check((await settle("cs_rollback")).balance, 7);
  const adjust = (action, amount) =>
    db
      .query("SELECT adjust_credits_atomic($1,$2,$3) AS result", [
        user,
        action,
        amount,
      ])
      .then((x) => x.rows[0].result);
  check(await adjust("add", 3), { previous_balance: 7, new_balance: 10 });
  check(await adjust("remove", 20), { previous_balance: 10, new_balance: 0 });
  for (const args of [
    ["add", -1],
    ["multiply", 2],
    ["add", 1001],
    ["add", null],
  ]) {
    await assert.rejects(() => adjust(...args));
    checks++;
  }
  await db.exec(`CREATE TABLE interview_sessions(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid,session_reference text);
    CREATE TABLE question_attempts(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid,session_reference text,interview_type text,
      subject text,topic text,difficulty text,question_id text,question text,outcome text,band text,skipped boolean,hints_used integer,
      student_answer text,question_index integer);`);
  await db.query(
    "INSERT INTO interview_sessions(user_id,session_reference) VALUES($1,'S1')",
    [user],
  );
  const attemptsMigration = await readFile(
    new URL(
      "../supabase/migrations/20260917000002_backend_attempt_integrity.sql",
      import.meta.url,
    ),
    "utf8",
  );
  await db.exec(attemptsMigration);
  await db.exec(attemptsMigration);
  checks++;
  const replace = (owner, attempts) =>
    db.query("SELECT replace_session_question_attempts($1,$2,$3)", [
      owner,
      "S1",
      JSON.stringify(attempts),
    ]);
  await replace(user, [
    { question_id: "Q1", question: "Original question", difficulty: "3" },
  ]);
  await assert.rejects(() => replace(another, []));
  checks++;
  await assert.rejects(() =>
    replace(user, [{ question_id: "Q2", hints_used: "invalid integer" }]),
  );
  checks++;
  check((await db.query("SELECT question_id FROM question_attempts")).rows, [
    { question_id: "Q1" },
  ]);
  await replace(user, [{ question_id: "Q2", hints_used: 1 }]);
  await replace(user, [{ question_id: "Q2", hints_used: 1 }]);
  check((await db.query("SELECT question_id FROM question_attempts")).rows, [
    { question_id: "Q2" },
  ]);
  await db.exec(
    "INSERT INTO question_attempts(provider_event_key) VALUES('tavus:repeat')",
  );
  await assert.rejects(() =>
    db.exec(
      "INSERT INTO question_attempts(provider_event_key) VALUES('tavus:repeat')",
    ),
  );
  checks++;
  check(
    (
      await db.query(
        "SELECT has_function_privilege('authenticated','replace_session_question_attempts(uuid,text,jsonb)','EXECUTE') AS allowed",
      )
    ).rows[0].allowed,
    false,
  );
  await db.exec(
    "CREATE TABLE questions(id text PRIMARY KEY,subject text,question text,active boolean DEFAULT true);",
  );
  const medicineBank = JSON.parse(
    await readFile(
      new URL(
        "../supabase/functions/interview-brain/_shared/medicine-bank.json",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  const actor = medicineBank.find((question) => question.roleplay);
  await db.query(
    "INSERT INTO questions(id,subject,question,active) VALUES($1,$2,$3,false)",
    [actor.id, "medicine", actor.question],
  );
  const edited = medicineBank.find(
    (question) => question.roleplay && question.id !== actor.id,
  );
  await db.query(
    "INSERT INTO questions(id,subject,question) VALUES($1,$2,$3)",
    [edited.id, "medicine", "An admin-edited prompt"],
  );
  const medicineMigration = await readFile(
    new URL(
      "../supabase/migrations/20260916000001_medicine_engine_reliability.sql",
      import.meta.url,
    ),
    "utf8",
  );
  await db.exec(medicineMigration);
  const restored = (
    await db.query("SELECT * FROM questions WHERE id=$1", [actor.id])
  ).rows[0];
  check(restored.active, false);
  check(restored.roleplay.name, actor.roleplay.name);
  check(
    (await db.query("SELECT roleplay FROM questions WHERE id=$1", [edited.id]))
      .rows[0].roleplay,
    null,
  );
  check(
    (await db.query("SELECT engine_revision FROM interview_sessions")).rows[0]
      .engine_revision,
    0,
  );
  await db.query("UPDATE questions SET roleplay=$1 WHERE id=$2", [
    { name: "Admin edit" },
    actor.id,
  ]);
  await db.exec(medicineMigration);
  check(
    (await db.query("SELECT roleplay FROM questions WHERE id=$1", [actor.id]))
      .rows[0].roleplay.name,
    "Admin edit",
  );
  check(
    (await db.query("SELECT count(*)::integer AS n FROM questions")).rows[0].n,
    2,
  );
  console.log(
    `PASS: ${checks} PostgreSQL checks: payment replay, permissions, matching, rollback, delayed success, balance adjustment, atomic attempt history and Medicine metadata preservation.`,
  );
} finally {
  await db.close();
}
