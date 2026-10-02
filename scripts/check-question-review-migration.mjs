// Exercise permissions, audit history and concurrent editor protection in isolated PostgreSQL.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const { PGlite } = await import(
  process.env.PGLITE_MODULE || "@electric-sql/pglite"
);
const db = new PGlite();
let checks = 0;
const eq = (a, b) => {
  assert.deepEqual(a, b);
  checks++;
};
const rejected = async (fn, match) => {
  await assert.rejects(fn, match);
  checks++;
};
const admin = "00000000-0000-4000-8000-000000000001";
const student = "00000000-0000-4000-8000-000000000002";
const hash = "a".repeat(64);
const save = async (
  status = "approved",
  revision = 0,
  notes = "",
  contentHash = hash,
) =>
  (
    await db.query(
      "SELECT save_interview_question_review($1,$2,$3,$4,$5,$6) AS result",
      ["test-batch", "test-question", contentHash, status, notes, revision],
    )
  ).rows[0].result;
const role = async (name, id = "") => {
  await db.exec(`RESET ROLE; SET ROLE ${name}`);
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [id]);
};
try {
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    CREATE FUNCTION public.is_current_user_admin() RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT auth.uid()='${admin}'::uuid $$;
    GRANT USAGE ON SCHEMA public,auth TO authenticated,anon,service_role;
    INSERT INTO auth.users VALUES('${admin}'),('${student}');`);
  const migration = await readFile(
    new URL(
      "../supabase/migrations/20261002000001_question_review.sql",
      import.meta.url,
    ),
    "utf8",
  );
  await db.exec(migration);
  await db.exec(migration);
  const conflictMigration = await readFile(
    new URL(
      "../supabase/migrations/20261002000002_question_review_conflicts.sql",
      import.meta.url,
    ),
    "utf8",
  );
  await db.exec(conflictMigration);
  await db.exec(conflictMigration);
  checks++;
  await role("anon");
  await rejected(() => save(), /permission denied/);
  await role("authenticated", student);
  await rejected(() => save(), /Administrator access required/);
  eq((await db.query("SELECT * FROM interview_question_reviews")).rows, []);
  await role("authenticated", admin);
  const first = await save("approved", 0, "A grounded prompt.");
  eq(first.revision, 1);
  eq(first.reviewer_id, admin);
  eq(first.status, "approved");
  await rejected(() => save("rejected", 0, "Stale browser"), { code: "PT409" });
  eq(
    (await db.query("SELECT * FROM interview_question_review_events")).rows
      .length,
    1,
  );
  await rejected(() => save("changes_requested", 1, ""), /Add a reason/);
  await rejected(() => save("rejected", 1, "  "), /Add a reason/);
  await rejected(() => save("published", 1, ""), /Invalid review/);
  await rejected(() => save("pending", 1, "x".repeat(4001)), /Invalid review/);
  await rejected(() => save("pending", 1, "", "invalid"), /Invalid review/);
  await rejected(() => save("pending", -1, ""), /Invalid review/);
  const updated = await save("changes_requested", 1, "  Clarify the role.  ");
  eq(updated.revision, 2);
  eq(updated.notes, "Clarify the role.");
  const reopened = await save("pending", 2, "Revised source", "b".repeat(64));
  eq(reopened.content_hash, "b".repeat(64));
  eq(reopened.revision, 3);
  eq(
    (
      await db.query(
        "SELECT revision,status FROM interview_question_review_events ORDER BY revision",
      )
    ).rows,
    [
      { revision: 1, status: "approved" },
      { revision: 2, status: "changes_requested" },
      { revision: 3, status: "pending" },
    ],
  );
  await rejected(
    () => db.query("UPDATE interview_question_reviews SET status='approved'"),
    /permission denied/,
  );
  await rejected(
    () => db.query("DELETE FROM interview_question_review_events"),
    /permission denied/,
  );
  await role("authenticated", student);
  eq((await db.query("SELECT * FROM interview_question_reviews")).rows, []);
  eq(
    (await db.query("SELECT * FROM interview_question_review_events")).rows,
    [],
  );
  await role("authenticated");
  await rejected(() => save(), /Administrator access required/);
  console.log(
    `PASS: ${checks} question review database checks; no production data touched.`,
  );
} finally {
  await db.close();
}
