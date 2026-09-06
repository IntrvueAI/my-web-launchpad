#!/usr/bin/env node
/**
 * Self-serve query tool for app_logs + interview_logs — pulls a session's full cross-boundary
 * trail, or sweeps by level/source/user/time, straight from the command line. This is the tool
 * meant for "interview session X went wrong" — give it the id and it prints everything recorded
 * about that session, merging the new site-wide app_logs table with the existing per-turn
 * interview_logs table into one chronological trail.
 *
 * Needs SUPABASE_SERVICE_ROLE_KEY — app_logs' SELECT policy is admin-only (RLS), and a script has
 * no logged-in admin session to authenticate as, so it must go in as service role instead. Not
 * committed anywhere; read from .env (gitignored) or the environment. To obtain it:
 *   1. export SUPABASE_ACCESS_TOKEN=<a Supabase Personal Access Token>
 *   2. curl -s -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
 *        https://api.supabase.com/v1/projects/fjkuuzfuysemrofcmnvd/api-keys
 *      and take the `service_role` key from the response.
 *   3. Save it into .env as SUPABASE_SERVICE_ROLE_KEY=... — or, if that call is rejected, get it
 *      from Supabase Dashboard -> Settings -> API -> service_role key.
 *
 * Usage:
 *   node scripts/query-app-logs.mjs --session <session_reference_or_uuid>   # the headline case
 *   node scripts/query-app-logs.mjs --user <email_or_uuid>
 *   node scripts/query-app-logs.mjs --request <request_id>
 *   node scripts/query-app-logs.mjs --level error --source edge:stripe-webhook --since 24h --limit 50
 *   (also wired as `npm run logs:query -- <same flags>`)
 */
import { createClient } from '@supabase/supabase-js';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function loadEnvFile() {
  try {
    const content = await fs.readFile(path.join(root, '.env'), 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {
    // no .env file — rely on already-exported environment variables
  }
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      const key = argv[i].slice(2);
      const value = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : 'true';
      args[key] = value;
    }
  }
  return args;
}

function sinceToIso(since) {
  const match = /^(\d+)([hd])$/.exec(since || '');
  if (!match) return null;
  const amount = Number(match[1]);
  const hours = match[2] === 'd' ? amount * 24 : amount;
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

function isUuid(s) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s || '');
}

function printRow(row, sourceLabel) {
  const time = new Date(row.created_at ?? row.timestamp).toISOString();
  const level = String(row.level ?? row.log_level ?? 'info').toUpperCase().padEnd(5);
  const source = String(row.source ?? sourceLabel ?? '').padEnd(28);
  const type = String(row.event_type ?? row.log_type ?? '').padEnd(24);
  console.log(`${time}  ${level}  ${source}  ${type}  ${row.message}`);
  if (row.metadata && Object.keys(row.metadata).length > 0) {
    console.log('  ' + JSON.stringify(row.metadata));
  }
}

async function main() {
  await loadEnvFile();
  const args = parseArgs(process.argv.slice(2));

  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error('Missing VITE_SUPABASE_URL/SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
    console.error("See this script's header comment for how to obtain the service role key.");
    process.exit(1);
  }
  const supabase = createClient(url, serviceKey);
  const limit = Number(args.limit) || 100;

  if (args.session) {
    const lookupColumn = isUuid(args.session) ? 'id' : 'session_reference';
    const { data: session, error: sessionErr } = await supabase
      .from('interview_sessions')
      .select('id, session_reference, user_id, interview_type, status, created_at, ended_at')
      .eq(lookupColumn, args.session)
      .maybeSingle();
    if (sessionErr || !session) {
      console.error(`No interview session found for ${args.session}`);
      process.exit(1);
    }
    console.log(`Session ${session.session_reference} (${session.id})`);
    console.log(`  user_id=${session.user_id} type=${session.interview_type} status=${session.status}`);
    console.log(`  created_at=${session.created_at} ended_at=${session.ended_at ?? '-'}`);
    console.log('');

    const [{ data: legacyLogs }, { data: appLogs }] = await Promise.all([
      supabase.from('interview_logs').select('*').eq('session_id', session.id).order('timestamp', { ascending: true }),
      supabase.from('app_logs').select('*').eq('interview_session_id', session.id).order('created_at', { ascending: true }),
    ]);

    const merged = [
      ...(legacyLogs ?? []).map((r) => ({ ...r, _ts: r.timestamp, _src: 'interview_logs' })),
      ...(appLogs ?? []).map((r) => ({ ...r, _ts: r.created_at, _src: 'app_logs' })),
    ].sort((a, b) => new Date(a._ts).getTime() - new Date(b._ts).getTime());

    if (merged.length === 0) {
      console.log('No log entries recorded for this session.');
      return;
    }
    for (const row of merged) printRow(row, row._src === 'interview_logs' ? 'interview_logs' : row.source);
    return;
  }

  let query = supabase.from('app_logs').select('*').order('created_at', { ascending: false }).limit(limit);

  if (args.request) query = query.eq('request_id', args.request);
  if (args.level) query = query.eq('level', args.level);
  if (args.source) query = query.ilike('source', `%${args.source}%`);
  if (args.since) {
    const iso = sinceToIso(args.since);
    if (iso) query = query.gte('created_at', iso);
  }
  if (args.user) {
    if (isUuid(args.user)) {
      query = query.eq('user_id', args.user);
    } else {
      const { data: profile } = await supabase.from('profiles').select('id').eq('email', args.user).maybeSingle();
      if (!profile) {
        console.error(`No profile found for ${args.user}`);
        process.exit(1);
      }
      query = query.eq('user_id', profile.id);
    }
  }

  const { data, error } = await query;
  if (error) {
    console.error('Query failed:', error.message);
    process.exit(1);
  }
  if (!data || data.length === 0) {
    console.log('No matching log entries.');
    return;
  }
  for (const row of [...data].reverse()) printRow(row);
}

main();
