// Read-only inbox SQL, exercised in isolated PostgreSQL; never touches production.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const { PGlite } = await import(
  process.env.PGLITE_MODULE || "@electric-sql/pglite"
);
const db = new PGlite();
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
let checks = 0;
const eq = (a, b) => {
  assert.deepEqual(a, b);
  checks++;
};
const inbox = async (args = {}) =>
  (
    await db.query(
      "SELECT get_mmi_feedback_inbox($1,$2,$3,$4,$5,$6) AS result",
      [
        args.owner || id(1),
        args.search || "",
        args.review || "all",
        args.type || "",
        args.invite || null,
        args.page || 1,
      ],
    )
  ).rows[0].result;
try {
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE TABLE mmi_trial_invites(id uuid PRIMARY KEY, owner_id uuid, label text);
    CREATE TABLE mmi_guest_trials(id uuid PRIMARY KEY, guest_user_id uuid, display_name text, created_at timestamptz DEFAULT now(), interviews_started integer DEFAULT 0, invite_id uuid);
    CREATE TABLE mmi_trial_reviews(trial_id uuid PRIMARY KEY,rating integer,experience text,improvement text,created_at timestamptz DEFAULT now());
    CREATE TABLE mmi_guest_runs(trial_id uuid,session_id uuid PRIMARY KEY);
    CREATE TABLE interview_sessions(id uuid PRIMARY KEY,user_id uuid,session_reference text,interview_type text,started_at timestamptz DEFAULT now(),status text);
    CREATE TABLE feedback(id uuid PRIMARY KEY,user_id uuid,session_reference text,interview_type text,total_score integer,created_at timestamptz DEFAULT now(),detailed_feedback jsonb,transcription text);
  `);
  const migration = await readFile(
    new URL(
      "../supabase/migrations/20261001000003_mmi_feedback_inbox.sql",
      import.meta.url,
    ),
    "utf8",
  );
  await db.exec(migration);
  await db.exec(migration);
  for (const role of ["anon", "authenticated", "service_role"]) {
    eq(
      (
        await db.query(
          "SELECT has_function_privilege($1,'get_mmi_feedback_inbox(uuid,text,text,text,uuid,integer)','EXECUTE') AS ok",
          [role],
        )
      ).rows[0].ok,
      role === "service_role",
    );
  }
  eq((await inbox()).trials, []);
  await db.query(
    "INSERT INTO mmi_trial_invites VALUES($1,$2,'Private Oxford preview'),($3,$4,'Other founder')",
    [id(10), id(1), id(11), id(2)],
  );
  for (let n = 0; n < 25; n++)
    await db.query(
      "INSERT INTO mmi_guest_trials(id,guest_user_id,display_name,invite_id,created_at) VALUES($1,$2,$3,$4,$5)",
      [
        id(100 + n),
        id(200 + n),
        n === 0 ? "Aïsha 100% O'Neil" : `Tester ${n}`,
        id(10),
        new Date(Date.UTC(2026, 8, 1, n)).toISOString(),
      ],
    );
  await db.query(
    "INSERT INTO mmi_guest_trials(id,guest_user_id,display_name,invite_id) VALUES($1,$2,'PRIVATE OTHER FOUNDER',$3)",
    [id(300), id(301), id(11)],
  );
  await db.query(
    "INSERT INTO mmi_trial_reviews VALUES($1,4,'some-issues','The sound dropped once.',now()),($2,1,'could-not-complete','OTHER PRIVATE REVIEW',now())",
    [id(100), id(300)],
  );
  await db.query(
    "INSERT INTO interview_sessions VALUES($1,$2,'session-a','medicine-oxford-pilot',now(),'completed'),($3,$2,'session-b','medicine-ethics-practice',now(),'active'),($4,$5,'foreign','medicine-cambridge-pilot',now(),'completed')",
    [id(400), id(200), id(401), id(402), id(301)],
  );
  await db.query("INSERT INTO mmi_guest_runs VALUES($1,$2),($1,$3),($4,$5)", [
    id(100),
    id(400),
    id(401),
    id(300),
    id(402),
  ]);
  await db.query(
    "INSERT INTO feedback VALUES($1,$2,'session-a','medicine-oxford-pilot',12,'2026-09-01','{\"overall\":\"Old assessment\"}','SECRET TRANSCRIPT'),($3,$2,'session-a','medicine-oxford-pilot',15,'2026-09-02','{\"overall\":\"Latest assessment\"}','SECRET TRANSCRIPT'),($4,$5,'foreign','medicine-cambridge-pilot',9,now(),'{}','FOREIGN TRANSCRIPT')",
    [id(500), id(200), id(501), id(502), id(301)],
  );
  const all = await inbox();
  eq(all.total, 25);
  eq(all.trials.length, 20);
  eq(all.summary, {
    testers: 25,
    assessments: 1,
    reviews: 1,
    issues: 1,
    averageRating: 4,
  });
  eq(JSON.stringify(all).includes("PRIVATE"), false);
  eq(JSON.stringify(all).includes("TRANSCRIPT"), false);
  const reviewed = await inbox({ review: "reviewed" });
  eq(reviewed.total, 1);
  eq(reviewed.trials[0].interviews.length, 2);
  eq(
    reviewed.trials[0].interviews.find((x) => x.feedback_id)?.feedback_id,
    id(501),
  );
  eq(
    reviewed.trials[0].interviews.find((x) => x.feedback_id)?.overview,
    "Latest assessment",
  );
  eq(
    reviewed.trials[0].interviews.find((x) => !x.feedback_id)?.total_score,
    null,
  );
  eq((await inbox({ review: "issues" })).total, 1);
  eq((await inbox({ review: "waiting" })).total, 24);
  eq((await inbox({ search: "aÏSHA 100% o'neil" })).total, 1);
  eq((await inbox({ search: "%" })).total, 1);
  eq((await inbox({ search: "OXFORD" })).total, 25);
  eq((await inbox({ search: "no match" })).total, 0);
  eq((await inbox({ type: "medicine-oxford-pilot" })).total, 1);
  eq((await inbox({ type: "medicine-ethics-practice" })).total, 1);
  eq((await inbox({ type: "medicine-cambridge-pilot" })).total, 0);
  eq((await inbox({ invite: id(11) })).total, 0);
  eq((await inbox({ owner: id(2) })).summary.issues, 1);
  const second = await inbox({ page: 2 });
  eq(second.trials.length, 5);
  eq(new Set([...all.trials, ...second.trials].map((x) => x.id)).size, 25);
  eq((await inbox({ page: 3 })).trials, []);
  await db.query(
    "INSERT INTO feedback VALUES($1,$2,NULL,'medicine-data-practice',8,now(),'{}','OLDER SAVED TRANSCRIPT')",
    [id(503), id(200)],
  );
  eq((await inbox()).summary.assessments, 2);
  eq((await inbox({ review: "reviewed" })).trials[0].interviews.length, 3);
  for (const sql of [
    "SELECT get_mmi_feedback_inbox(NULL)",
    `SELECT get_mmi_feedback_inbox('${id(1)}','','forged')`,
    `SELECT get_mmi_feedback_inbox('${id(1)}','','all','',NULL,-1)`,
  ]) {
    await assert.rejects(() => db.query(sql), /Invalid feedback filter/);
    checks++;
  }
  console.log(`${checks} feedback inbox SQL checks passed`);
} finally {
  await db.close();
}
