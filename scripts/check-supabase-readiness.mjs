// Read-only schema checks. Keys are used only for this project's API and never printed.
import { readFile } from "node:fs/promises";
const env = { ...process.env };
try {
  for (const line of (
    await readFile(new URL("../.env", import.meta.url), "utf8")
  ).split(/\r?\n/)) {
    const match = line.match(/^\s*([\w]+)\s*=\s*(.*?)\s*$/);
    if (match && !env[match[1]])
      env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
  }
} catch {
  /* Environment variables can be supplied by CI. */
}
const project = "fjkuuzfuysemrofcmnvd";
const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
if (url !== `https://${project}.supabase.co`)
  throw new Error("Project URL does not match this application");
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!key)
  throw new Error(
    "A server-side Supabase key is required for schema-only checks",
  );
const checks = [
  [
    "Interview sessions",
    "interview_sessions?select=id,engine_revision,last_activity_at&limit=0",
  ],
  [
    "Question metadata",
    "questions?select=id,roleplay,format,current_affairs_expiry,clinical_review_required&limit=0",
  ],
  [
    "Payment orders",
    "orders?select=id,amount,currency,credits_purchased,status&limit=0",
  ],
  [
    "Question attempts",
    "question_attempts?select=id,user_id,session_reference,question_id&limit=0",
  ],
];
let ready = true;
for (const [name, path] of checks) {
  const response = await fetch(`${url}/rest/v1/${path}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(10000),
  });
  const body = await response.json().catch(() => null);
  console.log(
    `${response.ok ? "PASS" : "PENDING"} ${name}: HTTP ${response.status}${body?.code ? ` (${body.code})` : ""}`,
  );
  ready &&= response.ok;
}
// Read the API description to check RPC availability without invoking any writes.
const schemaResponse = await fetch(`${url}/rest/v1/`, {
  headers: {
    apikey: key,
    Authorization: `Bearer ${key}`,
    Accept: "application/openapi+json",
  },
  signal: AbortSignal.timeout(10000),
});
const schema = await schemaResponse.json().catch(() => null);
for (const name of [
  "settle_checkout_payment",
  "adjust_credits_atomic",
  "replace_session_question_attempts",
]) {
  const present = schemaResponse.ok && Boolean(schema?.paths?.[`/rpc/${name}`]);
  console.log(`${present ? "PASS" : "PENDING"} Database operation: ${name}`);
  ready &&= present;
}
process.exitCode = ready ? 0 : 1;
