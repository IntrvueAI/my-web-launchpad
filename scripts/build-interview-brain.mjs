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
// Vendor into every edge function that needs the engine (each function bundles its own _shared).
const TARGETS = ['interview-brain', 'generate-interview-feedback'].map((fn) =>
  path.join(root, 'supabase/functions', fn, '_shared'),
);

// Files to vendor (all zod-free + Deno-safe). bank/index.ts and bank/schema.ts are intentionally
// excluded (they use import.meta.glob / zod); the edge function loads maths-bank.json instead.
// The LLM-driven agent (agent.ts) and its dependencies only. The legacy state-machine files
// (loop/judge/intent/phrases/machine) are intentionally NOT vendored — the brain no longer uses them.
const FILES = [
  'engine/types.ts',
  'engine/core.ts',
  'engine/adapt.ts',
  'engine/evidence.ts',
  'engine/flow.ts',
  'engine/agent.ts',
  'bank/select.ts',
  'subjects/types.ts',
  'subjects/maths/pack.ts',
  'subjects/logic/pack.ts',
  'subjects/currentaffairs/pack.ts',
  'subjects/elevenplus/pack.ts',
  'subjects/medicine/pack.ts',
  'subjects/medicine/schoolModes.ts',
  'subjects/chat/pack.ts',
];

/** Add `.ts` to extensionless relative import specifiers (Deno requirement). */
function addExtensions(code) {
  return code.replace(/(from\s+['"])(\.\.?\/[^'"]+?)(['"])/g, (m, a, spec, b) => {
    if (/\.(ts|js|json)$/.test(spec)) return m;
    return `${a}${spec}.ts${b}`;
  });
}

async function copyFiles(out) {
  for (const rel of FILES) {
    const code = await fs.readFile(path.join(SRC, rel), 'utf8');
    const dest = path.join(out, rel);
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.writeFile(dest, addExtensions(code));
  }
}

// The shared app_logs writer (see supabase/functions/_shared-src/appLogger.ts) needs to land in
// these two functions' _shared/ too, inside this script's own rm-rf/repopulate lifecycle — a
// second, independent vendor script touching the same directories would risk one silently
// deleting what the other just wrote. The other 14 (non-engine) functions are vendored separately
// by scripts/vendor-app-logger.mjs, which has no pre-existing _shared/ dir here to collide with.
async function copyLogger(out) {
  const code = await fs.readFile(path.join(root, 'supabase/functions/_shared-src/appLogger.ts'), 'utf8');
  await fs.writeFile(path.join(out, 'appLogger.ts'), addExtensions(code));
}

/** Build a combined `<subject>-bank.json` for every subject folder under questions/. */
async function buildBanks(out) {
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
    await fs.writeFile(path.join(out, `${subject}-bank.json`), JSON.stringify(all, null, 2) + '\n');
    counts[subject] = all.length;
  }
  return counts;
}

let counts = {};
for (const out of TARGETS) {
  await fs.rm(out, { recursive: true, force: true }); // drop stale vendored files
  await fs.mkdir(out, { recursive: true });
  await copyFiles(out);
  await copyLogger(out);
  counts = await buildBanks(out);
}
const summary = Object.entries(counts).map(([s, n]) => `${s}:${n}`).join(', ');
console.log(`[brain:build] vendored ${FILES.length} engine files + banks (${summary}) → ${TARGETS.length} functions`);
