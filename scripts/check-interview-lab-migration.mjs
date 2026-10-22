// Interview Lab tables in isolated PostgreSQL: administrators only, owner recorded, limits enforced.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const { PGlite } = await import(
  process.env.PGLITE_MODULE || "@electric-sql/pglite"
);
const db = new PGlite();
const admin = "00000000-0000-4000-8000-000000000001";
const otherAdmin = "00000000-0000-4000-8000-000000000002";
const student = "00000000-0000-4000-8000-000000000003";
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
const insertDraft = (name = "Warmer opening", extra = "") =>
  db.query(`INSERT INTO interview_lab_drafts(name,platform,base_version${extra ? ",extra_instructions" : ""}) VALUES($1,'11plus','2026-10-20'${extra ? ",$2" : ""}) RETURNING id, owner_id`, extra ? [name, extra] : [name]);
try {
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    CREATE FUNCTION public.is_current_user_admin() RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT auth.uid() IN ('${admin}'::uuid,'${otherAdmin}'::uuid) $$;
    GRANT USAGE ON SCHEMA public,auth TO authenticated,anon,service_role;
    INSERT INTO auth.users VALUES('${admin}'),('${otherAdmin}'),('${student}');`);
  const sql = await readFile(new URL("../supabase/migrations/20261022000002_interview_lab.sql", import.meta.url), "utf8");
  await db.exec(sql);
  await db.exec(sql);
  checks++;

  await as("anon");
  await reject(() => db.query("SELECT * FROM interview_lab_drafts"), /permission denied/);
  await as("authenticated", student);
  await reject(() => insertDraft(), /row-level security/);
  eq((await db.query("SELECT count(*)::int AS n FROM interview_lab_notes")).rows[0].n, 0);

  await as("authenticated", admin);
  const draft = (await insertDraft()).rows[0];
  eq(draft.owner_id, admin);
  await reject(() => db.query("INSERT INTO interview_lab_drafts(name,platform,base_version,owner_id) VALUES('Forged','11plus','2026-10-20',$1)", [otherAdmin]), /row-level security/);
  await reject(() => db.query("INSERT INTO interview_lab_drafts(name,platform,base_version) VALUES('x','other','2026-10-20')"), /check constraint/);
  await reject(() => insertDraft("Too long", "x".repeat(2001)), /check constraint/);
  await reject(() => db.query("INSERT INTO interview_lab_drafts(name,platform,base_version,behaviour) VALUES('x','medicine','v','[]')"), /check constraint/);
  await db.query("INSERT INTO interview_lab_notes(session_reference,interview_type,version,draft_id,rating,notes) VALUES('ref-1','maths-interview','2026-10-20',$1,4,'Clear opening')", [draft.id]);
  await reject(() => db.query("INSERT INTO interview_lab_notes(session_reference,interview_type,version,rating) VALUES('ref-2','maths-interview','2026-10-20',6)"), /check constraint/);
  await reject(() => db.query("INSERT INTO interview_lab_notes(session_reference,interview_type,version) VALUES('ref-1','maths-interview','2026-10-20')"), /duplicate key/);
  const before = (await db.query("SELECT updated_at FROM interview_lab_notes WHERE session_reference='ref-1'")).rows[0].updated_at;
  await db.query("UPDATE interview_lab_notes SET notes='Clear opening, rushed ending', updated_at=now()-interval '1 day' WHERE session_reference='ref-1'");
  const after = (await db.query("SELECT notes, updated_at FROM interview_lab_notes WHERE session_reference='ref-1'")).rows[0];
  eq(after.notes, "Clear opening, rushed ending");
  eq(after.updated_at >= before, true);

  // Another administrator can read shared work but not rewrite someone else's row.
  await as("authenticated", otherAdmin);
  eq((await db.query("SELECT name FROM interview_lab_drafts")).rows.map((r) => r.name), ["Warmer opening"]);
  await reject(() => db.query("UPDATE interview_lab_notes SET notes='changed' WHERE session_reference='ref-1'"), /row-level security/);

  // Deleting a draft keeps the notes, unlinked.
  await as("authenticated", admin);
  await db.query("DELETE FROM interview_lab_drafts WHERE id=$1", [draft.id]);
  eq((await db.query("SELECT draft_id FROM interview_lab_notes WHERE session_reference='ref-1'")).rows[0].draft_id, null);
  console.log(`PASS: ${checks} interview lab checks: admin-only access, owner recorded, limits, notes survive draft deletion, repeatable.`);
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
