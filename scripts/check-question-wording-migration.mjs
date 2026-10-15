// Apply the reviewer wording migration in isolated PostgreSQL: original rows update, re-running is a
// no-op, and a question already edited in Admin > Questions is never overwritten.
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
const sql = await readFile(
  new URL("../supabase/migrations/20261015000001_medicine_question_wording.sql", import.meta.url),
  "utf8",
);
// Original wording is recovered from the migration's own guards, so the check cannot drift from it.
const originals = [...sql.matchAll(/WHERE id = '([^']+)' AND subject = 'medicine' AND question = \$o\$([\s\S]*?)\$o\$;/g)]
  .map(([, id, question]) => ({ id, question }));
eq(originals.length, 9);

await db.exec(`CREATE TABLE public.questions (
  id text PRIMARY KEY, subject text NOT NULL, topic text, question text NOT NULL, answer text,
  rubric jsonb, live_probes jsonb, active boolean DEFAULT true, updated_at timestamptz DEFAULT now());`);
for (const { id, question } of originals)
  await db.query(
    "INSERT INTO public.questions (id, subject, question, answer, rubric, live_probes) VALUES ($1, 'medicine', $2, 'old answer', '{\"strong\":\"old\"}', '[]')",
    [id, question],
  );
// An administrator has already reworded MED-M1 by hand.
await db.query("UPDATE public.questions SET question = 'Admin edit' WHERE id = 'MED-M1'");
// A different subject with the same id must never change.
await db.query("INSERT INTO public.questions (id, subject, question) VALUES ('MED-E6-copy', 'maths', 'untouched')");

await db.exec(sql);
const rows = async () =>
  (await db.query("SELECT id, question, answer, rubric, live_probes FROM public.questions ORDER BY id")).rows;
const after = await rows();
const byId = Object.fromEntries(after.map((r) => [r.id, r]));
eq(byId["MED-M1"].question, "Admin edit");
eq(byId["MED-E6-copy"].question, "untouched");
for (const { id, question } of originals.filter((o) => o.id !== "MED-M1")) {
  assert.notEqual(byId[id].question, question, `${id} should be reworded`);
  checks++;
}
eq(byId["MED-E6"].question.startsWith("You are a junior doctor"), true);
eq(byId["MED-E6"].rubric.weak.includes("false reassurance"), true);
eq(byId["MED-M10"].answer.includes("length of training"), true);
eq(Array.isArray(byId["MED-M10"].live_probes) && byId["MED-M10"].live_probes.length > 0, true);
eq(byId["MED-E10"].answer, "old answer");

await db.exec(sql);
eq(await rows(), after);

console.log(`PASS: ${checks} question wording migration checks: guarded rewording, admin edits preserved, repeatable.`);
