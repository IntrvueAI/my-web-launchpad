#!/usr/bin/env node
/**
 * Vendor the pure-TS interview engine into the Deno edge function and build the combined bank.
 *
 * Why: `src/interview` is the single source of truth (and is unit-tested), but Supabase Edge
 * Functions run on Deno, which (a) can't resolve Vite's `import.meta.glob` and (b) requires
 * explicit file extensions on relative imports. This script copies the zod-free engine subset
 * into `supabase/functions/interview-brain/_shared/`, rewrites relative imports to add `.ts`,
 * and flattens the tiered question folders into one `maths-bank.json`.
 *
 * Run after editing anything under src/interview/engine, /bank/select.ts or /subjects:
 *   node scripts/build-interview-brain.mjs   (also wired as `npm run brain:build`)
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(root, 'src/interview');
const OUT = path.join(root, 'supabase/functions/interview-brain/_shared');

// Files to vendor (all zod-free + Deno-safe). bank/index.ts and bank/schema.ts are intentionally
// excluded (they use import.meta.glob / zod); the edge function loads maths-bank.json instead.
// The LLM-driven agent (agent.ts) and its dependencies only. The legacy state-machine files
// (loop/judge/intent/phrases/machine) are intentionally NOT vendored — the brain no longer uses them.
const FILES = [
  'engine/types.ts',
  'engine/core.ts',
  'engine/adapt.ts',
  'engine/evidence.ts',
  'engine/agent.ts',
  'bank/select.ts',
  'subjects/types.ts',
  'subjects/maths/pack.ts',
  'subjects/logic/pack.ts',
];

/** Add `.ts` to extensionless relative import specifiers (Deno requirement). */
function addExtensions(code) {
  return code.replace(/(from\s+['"])(\.\.?\/[^'"]+?)(['"])/g, (m, a, spec, b) => {
    if (/\.(ts|js|json)$/.test(spec)) return m;
    return `${a}${spec}.ts${b}`;
  });
}

async function copyFiles() {
  for (const rel of FILES) {
    const code = await fs.readFile(path.join(SRC, rel), 'utf8');
    const dest = path.join(OUT, rel);
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.writeFile(dest, addExtensions(code));
  }
}

/** Build a combined `<subject>-bank.json` for every subject folder under questions/. */
async function buildBanks() {
  const questionsDir = path.join(SRC, 'bank/questions');
  const subjects = await fs.readdir(questionsDir);
  const counts = {};
  for (const subject of subjects) {
    const subjDir = path.join(questionsDir, subject);
    if (!(await fs.stat(subjDir)).isDirectory()) continue;
    const all = [];
    for (const topic of await fs.readdir(subjDir)) {
      const tdir = path.join(subjDir, topic);
      if (!(await fs.stat(tdir)).isDirectory()) continue;
      for (const file of await fs.readdir(tdir)) {
        if (!file.endsWith('.json')) continue;
        all.push(...JSON.parse(await fs.readFile(path.join(tdir, file), 'utf8')));
      }
    }
    await fs.writeFile(path.join(OUT, `${subject}-bank.json`), JSON.stringify(all, null, 2) + '\n');
    counts[subject] = all.length;
  }
  return counts;
}

await fs.rm(OUT, { recursive: true, force: true }); // drop stale vendored files
await fs.mkdir(OUT, { recursive: true });
await copyFiles();
const counts = await buildBanks();
const summary = Object.entries(counts).map(([s, n]) => `${s}:${n}`).join(', ');
console.log(`[brain:build] vendored ${FILES.length} engine files + banks (${summary}) → ${path.relative(root, OUT)}`);
