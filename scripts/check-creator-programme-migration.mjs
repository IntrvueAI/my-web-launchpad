// Creator programme in isolated PostgreSQL: attribution rules, server discounts, commissions inside
// settlement, private creator view, payouts, and administrator-only economics.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const { PGlite } = await import(
  process.env.PGLITE_MODULE || "@electric-sql/pglite"
);
const db = new PGlite();
const admin = "00000000-0000-4000-8000-000000000001";
const creatorUser = "00000000-0000-4000-8000-000000000002";
const student = "00000000-0000-4000-8000-000000000003";
const oldUser = "00000000-0000-4000-8000-000000000004";
const unconfirmed = "00000000-0000-4000-8000-000000000005";
const other = "00000000-0000-4000-8000-000000000006";
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
const one = async (sql, params = []) => (await db.query(sql, params)).rows[0];
const value = async (sql, params = []) => Object.values(await one(sql, params))[0];
let orderNumber = 0;
async function buy(user, platform, amount, credits, discount = 0) {
  await as("service_role");
  const session = `cs_${++orderNumber}`;
  await db.query(
    "INSERT INTO orders(user_id,stripe_session_id,amount,credits_purchased,platform,metadata) VALUES($1,$2,$3,$4,$5,$6)",
    [user, session, amount, credits, platform, JSON.stringify(discount ? { discount_pence: discount, list_price_pence: amount + discount } : {})],
  );
  return (await one("SELECT settle_checkout_payment($1,$2,'gbp',$3,$4) AS r", [session, amount, user, credits])).r;
}

try {
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE SCHEMA auth;
    CREATE TABLE auth.users(id uuid PRIMARY KEY, email text, email_confirmed_at timestamptz, created_at timestamptz NOT NULL DEFAULT now());
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    CREATE FUNCTION public.is_current_user_admin() RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT auth.uid() = '${admin}'::uuid $$;
    GRANT USAGE ON SCHEMA public,auth TO authenticated,anon,service_role;
    INSERT INTO auth.users(id,email,email_confirmed_at,created_at) VALUES
      ('${admin}','admin@example.test',now(),now()),
      ('${creatorUser}','Sam@Example.test',now(),now()),
      ('${student}','student@example.test',now(),now()),
      ('${oldUser}','old@example.test',now(),now() - interval '40 days'),
      ('${unconfirmed}','unconfirmed@example.test',NULL,now()),
      ('${other}','other@example.test',now(),now());
    CREATE TABLE credits_balance(user_id uuid PRIMARY KEY, credits integer NOT NULL DEFAULT 0, updated_at timestamptz DEFAULT now());
    CREATE TABLE orders(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, stripe_session_id text UNIQUE,
      amount integer NOT NULL, currency text NOT NULL DEFAULT 'gbp', credits_purchased integer NOT NULL DEFAULT 0,
      status text NOT NULL DEFAULT 'pending', metadata jsonb DEFAULT '{}', created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now());
    CREATE TABLE interview_sessions(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), session_reference text UNIQUE NOT NULL,
      user_id uuid REFERENCES auth.users(id), interview_type text NOT NULL, status text NOT NULL DEFAULT 'active',
      ended_at timestamptz, engine_state jsonb, engine_revision integer NOT NULL DEFAULT 0);
    GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;`);
  const medicine = await readFile(new URL("../supabase/migrations/20261022000003_medicine_credits.sql", import.meta.url), "utf8");
  const sql = await readFile(new URL("../supabase/migrations/20261024000001_creator_programme.sql", import.meta.url), "utf8");
  await db.exec(medicine);
  await db.exec(sql);
  await db.exec(sql);
  checks++;
  await db.exec("GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role");

  // Only administrators manage creators, links and costs.
  await as("anon");
  await reject(() => db.query("SELECT * FROM creators"), /permission denied/);
  await as("authenticated", student);
  await reject(() => db.query("INSERT INTO creators(email,name) VALUES('x@example.test','X')"), /row-level security/);
  eq((await db.query("SELECT * FROM programme_costs")).rows, []);
  await as("authenticated", admin);
  const creator = await value("INSERT INTO creators(email,name) VALUES('sam@example.test','Sam') RETURNING id");
  const link = await value("INSERT INTO creator_links(creator_id,code,platform,label) VALUES($1,'studywithsam','medicine','YouTube') RETURNING id", [creator]);
  const schoolLink = await value("INSERT INTO creator_links(creator_id,code,platform,commission_type,commission_fixed_pence,commission_scope) VALUES($1,'sam-11','11plus','fixed',250,'twelve_months') RETURNING id", [creator]);
  await reject(() => db.query("INSERT INTO creator_links(creator_id,code,platform) VALUES($1,'Bad Code','medicine')", [creator]), /check constraint/);
  await reject(() => db.query("INSERT INTO creator_links(creator_id,code,platform) VALUES($1,'studywithsam','11plus')", [creator]), /duplicate key/);
  await reject(() => db.query("INSERT INTO creator_links(creator_id,code,platform,discount_percent) VALUES($1,'greedy','medicine',60)", [creator]), /check constraint/);
  await reject(() => db.query("INSERT INTO creators(email,name) VALUES('SAM@example.test','Duplicate')"), /duplicate key/);
  await db.query("UPDATE programme_costs SET medicine_cost_per_credit_pence = 120");
  eq(await value("SELECT medicine_cost_per_credit_pence FROM programme_costs"), 120);

  // Invited creators are inactive until they sign in with the confirmed, invited email.
  await as("anon");
  eq(await value("SELECT record_referral_visit('studywithsam')"), null);
  await as("authenticated", unconfirmed);
  eq(await value("SELECT claim_creator_account()"), null);
  await as("authenticated", creatorUser);
  eq(await value("SELECT claim_creator_account()"), creator);
  eq(await value("SELECT status FROM creators"), "active");
  eq(await value("SELECT claim_creator_account()"), creator);

  // Visits are counted anonymously; unknown or paused links reveal nothing.
  await as("anon");
  eq(await value("SELECT record_referral_visit('STUDYWITHSAM ')"), { code: "studywithsam", platform: "medicine", creator: "Sam", discountPercent: 10 });
  eq(await value("SELECT record_referral_visit('nobody')"), null);
  await reject(() => db.query("SELECT attach_referral('studywithsam')"), /permission denied/);

  // Attribution: once, new accounts only, never the creator's own link, never existing customers.
  await as("authenticated", creatorUser);
  eq((await value("SELECT attach_referral('studywithsam')")).reason, "own_link");
  await as("authenticated", oldUser);
  eq((await value("SELECT attach_referral('studywithsam')")).reason, "existing_account");
  await buy(other, "medicine", 699, 1);
  await as("authenticated", other);
  eq((await value("SELECT attach_referral('studywithsam')")).reason, "existing_customer");
  await as("authenticated", student);
  eq(await value("SELECT get_my_referral_offer('medicine')"), null);
  eq(await value("SELECT attach_referral('studywithsam')"), { attached: true, creator: "Sam", discountPercent: 10 });
  eq((await value("SELECT attach_referral('sam-11')")).reason, "already_referred");
  eq(await value("SELECT get_my_referral_offer('medicine')"), { creator: "Sam", discountPercent: 10 });
  eq(await value("SELECT get_my_referral_offer('11plus')"), null);
  await reject(() => db.query("SELECT referral_offer_for($1,'medicine')", [student]), /permission denied/);
  eq((await db.query("SELECT * FROM referrals")).rows, []);

  // The first purchase earns the commission inside settlement, once, at the paid (discounted) price.
  const first = await buy(student, "medicine", 3149, 6, 350);
  eq([first.credits_added, first.platform], [6, "medicine"]);
  await as("service_role");
  const commission = await one("SELECT * FROM creator_commissions WHERE referred_user_id=$1", [student]);
  eq([commission.list_price_pence, commission.discount_pence, commission.amount_paid_pence, commission.commission_pence, commission.status],
    [3499, 350, 3149, 630, "pending"]);
  eq(commission.available_at > new Date(Date.now() + 29 * 86400000), true);
  await db.query("SELECT settle_checkout_payment('cs_2',3149,'gbp',$1,6)", [student]);
  eq(await value("SELECT count(*)::int FROM creator_commissions"), 1);
  await buy(student, "medicine", 699, 1);
  eq(await value("SELECT count(*)::int FROM creator_commissions"), 1);
  await as("authenticated", student);
  eq(await value("SELECT get_my_referral_offer('medicine')"), null);

  // A twelve-month fixed-fee 11+ link earns on every purchase, never more than was paid.
  await as("authenticated", admin);
  const fresh = "00000000-0000-4000-8000-000000000007";
  await db.exec("RESET ROLE");
  await db.query("INSERT INTO auth.users(id,email,email_confirmed_at) VALUES($1,'fresh@example.test',now())", [fresh]);
  await as("authenticated", fresh);
  eq((await value("SELECT attach_referral('sam-11')")).attached, true);
  await buy(fresh, "11plus", 1999, 2);
  await buy(fresh, "11plus", 199, 2);
  await buy(fresh, "medicine", 699, 1);
  await as("service_role");
  eq((await db.query("SELECT commission_pence FROM creator_commissions WHERE referred_user_id=$1 ORDER BY created_at", [fresh])).rows.map((r) => r.commission_pence), [250, 199]);

  // Creators see totals and anonymous activity only.
  await as("authenticated", creatorUser);
  const view = await value("SELECT creator_dashboard()");
  eq(view.links.map((l) => [l.code, l.visits, l.signups, l.payingCustomers, l.earnedPence]), [["studywithsam", 1, 1, 1, 630], ["sam-11", 0, 1, 1, 449]]);
  eq(view.earnings, { holdPence: 1079, readyPence: 0, paidPence: 0 });
  eq(JSON.stringify(view).includes(student) || JSON.stringify(view).includes(fresh), false);
  eq(view.recent.every((r) => r.status === "hold"), true);
  eq((await db.query("SELECT * FROM creator_commissions")).rows, []);
  await db.query("UPDATE creators SET payout_status='verified'");
  eq(await value("SELECT payout_status FROM creators"), "not_connected");
  await as("authenticated", student);
  eq(await value("SELECT creator_dashboard()"), null);
  await reject(() => db.query("SELECT admin_creator_overview()"), /Administrator access required/);

  // Administrators see revenue, discounts and allocation per link.
  await as("authenticated", admin);
  const overview = await value("SELECT admin_creator_overview()");
  const medicineRow = overview.links.find((l) => l.linkId === link);
  eq([medicineRow.revenuePence, medicineRow.orders, medicineRow.credits, medicineRow.discountPence, medicineRow.holdPence],
    [3149 + 699, 2, 7, 350, 630]);
  eq(overview.costs.medicine_cost_per_credit_pence, 120);
  await reject(() => db.query("SELECT reverse_creator_commission($1,'')", [commission.id]), /reason is required/);

  // Payouts: only to verified Stripe accounts, only earnings past the hold, one at a time.
  await as("service_role");
  eq((await value("SELECT begin_creator_payout($1,$2)", [creator, admin])).reason, "payouts_not_ready");
  await db.query("UPDATE creators SET stripe_account_id='acct_123', payout_status='verified'");
  eq((await value("SELECT begin_creator_payout($1,$2)", [creator, admin])).reason, "nothing_ready");
  await db.query("UPDATE creator_commissions SET available_at = now() - interval '1 day' WHERE link_id=$1", [link]);
  const payout = await value("SELECT begin_creator_payout($1,$2)", [creator, admin]);
  eq([payout.ok, payout.resumed, payout.amountPence, payout.destination], [true, false, 630, "acct_123"]);
  eq((await value("SELECT begin_creator_payout($1,$2)", [creator, admin])).payoutId, payout.payoutId);
  await db.query("SELECT finish_creator_payout($1,NULL,'Insufficient platform balance')", [payout.payoutId]);
  eq(await value("SELECT count(*)::int FROM creator_commissions WHERE payout_id IS NOT NULL"), 0);
  const retry = await value("SELECT begin_creator_payout($1,$2)", [creator, admin]);
  await db.query("SELECT finish_creator_payout($1,'tr_1',NULL)", [retry.payoutId]);
  eq(await value("SELECT status FROM creator_payouts WHERE id=$1", [retry.payoutId]), "paid");
  await as("authenticated", creatorUser);
  eq((await value("SELECT creator_dashboard()")).earnings, { holdPence: 449, readyPence: 0, paidPence: 630 });
  eq((await db.query("SELECT status FROM creator_payouts ORDER BY created_at")).rows.map((r) => r.status), ["failed", "paid"]);
  await as("authenticated", student);
  eq((await db.query("SELECT * FROM creator_payouts")).rows, []);

  // Paid earnings cannot be reversed; held ones can, with a reason.
  await as("authenticated", admin);
  eq(await value("SELECT reverse_creator_commission($1,'Refunded')", [commission.id]), false);
  const held = await value("SELECT id FROM creator_commissions WHERE status='pending' LIMIT 1");
  eq(await value("SELECT reverse_creator_commission($1,'Refunded order')", [held]), true);

  // Pausing a creator stops discounts, new referrals and commissions.
  await db.query("UPDATE creators SET status='paused'");
  await as("anon");
  eq(await value("SELECT record_referral_visit('studywithsam')"), null);
  console.log(`PASS: ${checks} creator programme checks: admin-only management, claim by confirmed email, anonymous visits, attribution rules, discounts and commissions in settlement, private creator view, payouts, reversals, pausing, repeatable.`);
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
