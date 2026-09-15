import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => JSON.parse(readFileSync(path.join(root,p),'utf8'));
const drafts = read('src/data/interview-staging/medicine-expansion.json');
const research = read('src/interview/medicine-content/expansion/research.json');
function walk(dir) { return readdirSync(dir,{withFileTypes:true}).flatMap((x)=>x.isDirectory()?walk(path.join(dir,x.name)):x.name.endsWith('.json')?[path.join(dir,x.name)]:[]); }
const runtime = walk(path.join(root,'src/interview/bank/questions/medicine')).flatMap((p)=>JSON.parse(readFileSync(p,'utf8')));
const ids = new Set(); const prompts = new Set();
assert(drafts.length > 0, 'Draft bank is empty');
for(const q of drafts) {
 assert.equal(q.status,'draft',`${q.id}: must remain a draft`);
 assert(!ids.has(q.id),`${q.id}: duplicate ID`); ids.add(q.id);
 const prompt=q.question.toLowerCase().replace(/\W/g,'');
 assert(!prompts.has(prompt),`${q.id}: duplicate prompt`);prompts.add(prompt);
 assert(!runtime.some((r)=>r.id===q.id || r.question===q.question),`${q.id}: leaked to runtime bank`);
 for(const key of ['title','topic','answer','originality']) assert(typeof q[key]==='string' && q[key].trim(),`${q.id}: missing ${key}`);
 assert(q.question.length>100 && q.answer.length>150,`${q.id}: incomplete authored station`);
 assert([2,3].includes(q.difficulty),`${q.id}: missing difficulty`);
 assert(q.tags.length>=3 && q.tracks.length>0,`${q.id}: missing shared-bank tags`);
 assert(q.liveProbes.length>=2 && q.liveProbes.every((p)=>p.probe && p.goodResponse),`${q.id}: missing follow-up guidance`);
 assert(['strong','developing','weak'].every((b)=>q.rubric[b]?.length>30),`${q.id}: incomplete rubric`);
 assert(q.reviewRequired.length>0,`${q.id}: review owner missing`);
}
console.log(`PASS: ${drafts.length} original drafts have unique IDs, prompts, tags, follow-ups and banded rubrics.`);
console.log(`PASS: all drafts remain outside the ${runtime.length}-station runtime source bank.`);
const sources = new Set(research.sources.map((s)=>s.id));
for(const school of research.schools) {
 assert(school.sourceIds.every((s)=>sources.has(s)),`${school.id}: missing source`);
 assert(school.facts.every((f)=>sources.has(f.source)),`${school.id}: unsupported fact`);
 assert(school.unknowns && school.metric.population && school.metric.cycle,`${school.id}: missing uncertainty/cohort`);
 if(school.metric.unit==='%') assert.equal((100*school.metric.numerator/school.metric.denominator).toFixed(1)+'%',school.metric.display);
}
console.log('PASS: school claims resolve to source records; derived offer rates reconcile with raw counts.');
for(const track of ['academic','mmi'])console.log(`COVERAGE: ${track}: ${drafts.filter((q)=>q.tracks.includes(track)).length} eligible draft stations.`);
console.log('NOTE: these are structural checks. Human content review and release are still required.');
