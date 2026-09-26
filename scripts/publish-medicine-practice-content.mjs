// Add only the two reviewed, non-clinical roleplays. Existing edits/retirements are preserved.
// Default is read-only; use --apply to insert missing IDs. See docs/MEDICINE-PRACTICE-RELEASE.md.
import { readFile } from 'node:fs/promises';
import { isDeepStrictEqual } from 'node:util';

const approved = [['3.json', 'MED-RP-013'], ['2.json', 'MED-RP-018']];
const env = { ...process.env };
try {
  for (const line of (await readFile(new URL('../.env', import.meta.url), 'utf8')).split(/\r?\n/)) {
    const match = line.match(/^\s*(\w+)\s*=\s*(.*?)\s*$/);
    if (match && !env[match[1]]) env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  }
} catch { /* CI can provide secrets through the environment. */ }
const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
if (url !== 'https://fjkuuzfuysemrofcmnvd.supabase.co') throw new Error('Unexpected Supabase project');
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!key) throw new Error('Server-side Supabase key is required');
async function request(path, method = 'GET', body) {
  const response = await fetch(`${url}/rest/v1/${path}`, {
    method, headers: { apikey:key, Authorization:`Bearer ${key}`, 'Content-Type':'application/json', Prefer:'resolution=ignore-duplicates,return=representation' },
    body:body === undefined ? undefined : JSON.stringify(body), signal:AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error(`Question publication failed: HTTP ${response.status}`);
  return response.json();
}
const before = await request('questions?subject=eq.medicine&select=*&order=id&limit=1000');
const ids = new Set(before.map(row => row.id));
const rows = [];
for (const [file, id] of approved) {
  const bank = JSON.parse(await readFile(new URL(`../src/interview/bank/questions/medicine/roleplay-stations/${file}`, import.meta.url), 'utf8'));
  const q = bank.find(question => question.id === id);
  if (!q?.roleplay?.applicantRole || q.subject !== 'medicine' || q.topic !== 'roleplay-stations' || q.clinicalReviewRequired) throw new Error(`Review mismatch: ${id}`);
  rows.push({ id:q.id, subject:q.subject, topic:q.topic, difficulty:q.difficulty, question_type:q.questionType, title:q.title, tags:q.tags,
    question:q.question, answer:q.answer, model_reasoning_path:q.modelReasoningPath, rubric:q.rubric, common_mistakes:q.commonMistakes,
    live_probes:q.liveProbes, hints:q.hints, roleplay:q.roleplay, format:q.format, clinical_review_required:false, active:true });
}
const missing = rows.filter(row => !ids.has(row.id));
console.log(JSON.stringify({ mode:process.argv.includes('--apply')?'apply':'read-only', existingMedicineQuestions:before.length, missingReviewedIds:missing.map(row=>row.id), preservedIds:rows.filter(row=>ids.has(row.id)).map(row=>row.id) }));
if (process.argv.includes('--apply')) {
  const inserted = missing.length ? await request('questions?on_conflict=id','POST',missing) : [];
  const after = await request('questions?subject=eq.medicine&select=*&order=id&limit=1000');
  for (const old of before) {
    if (!isDeepStrictEqual(old, after.find(row => row.id === old.id))) throw new Error('An existing Medicine question changed during publication; inspect concurrent edits');
  }
  for (const row of inserted) {
    const stored = after.find(question => question.id === row.id);
    if (!stored?.active || !stored.roleplay?.applicantRole) throw new Error(`Inserted roleplay not available: ${row.id}`);
  }
  console.log(JSON.stringify({ inserted:inserted.map(row=>row.id), medicineQuestions:after.length, existingQuestionsUnchanged:true }));
}
