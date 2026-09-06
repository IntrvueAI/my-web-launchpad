#!/usr/bin/env node
/**
 * Vendor the shared app_logs writer (supabase/functions/_shared-src/appLogger.ts) into every edge
 * function that ISN'T already handled by build-interview-brain.mjs. interview-brain and
 * generate-interview-feedback have their own `_shared/` populated (and periodically wiped/rebuilt)
 * by that script — vendoring the logger there too would risk two scripts fighting over the same
 * directory, so this one deliberately skips them and only ever adds files (no rm -rf) elsewhere.
 *
 * Run after editing supabase/functions/_shared-src/appLogger.ts:
 *   node scripts/vendor-app-logger.mjs   (also wired as `npm run logger:vendor`)
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FUNCTIONS_DIR = path.join(root, 'supabase/functions');
const SOURCE = path.join(FUNCTIONS_DIR, '_shared-src/appLogger.ts');
const SKIP = new Set(['_shared-src', 'interview-brain', 'generate-interview-feedback']);

const entries = await fs.readdir(FUNCTIONS_DIR, { withFileTypes: true });
const targets = entries.filter((e) => e.isDirectory() && !SKIP.has(e.name)).map((e) => e.name);

const code = await fs.readFile(SOURCE, 'utf8');
for (const fn of targets) {
  const dest = path.join(FUNCTIONS_DIR, fn, '_shared', 'appLogger.ts');
  await fs.mkdir(path.dirname(dest), { recursive: true });
  await fs.writeFile(dest, code);
}

console.log(`[logger:vendor] vendored appLogger.ts → ${targets.length} functions (${targets.join(', ')})`);
