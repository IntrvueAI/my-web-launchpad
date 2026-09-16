// Defaults to a read-only deployment plan. --apply is an explicit live deployment.
// Never resets the database, replays historical migrations or prunes remote functions.
import { readdir, readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
const project = "fjkuuzfuysemrofcmnvd";
const names = (
  await readdir(new URL("../supabase/functions/", import.meta.url), {
    withFileTypes: true,
  })
)
  .filter((entry) => entry.isDirectory() && !entry.name.startsWith("_"))
  .map((entry) => entry.name)
  .sort();
for (const name of names) {
  if (!/^[a-z][a-z0-9-]+$/.test(name))
    throw new Error("Invalid function directory");
  await readFile(
    new URL(`../supabase/functions/${name}/index.ts`, import.meta.url),
  );
}
const apply = process.argv.includes("--apply");
const allowedMigrations = new Set([
  "20260916000001_medicine_engine_reliability.sql",
  "20260917000001_backend_payment_integrity.sql",
  "20260917000002_backend_attempt_integrity.sql",
]);
console.log(
  `${apply ? "Deploying" : "Planning"} ${names.length} functions for ${project}: ${names.join(", ")}`,
);
function cli(args, combined = false) {
  // Arguments are fixed command words, project ID and validated directory names, never secrets.
  if (args.some((value) => !/^[A-Za-z0-9_./=-]+$/.test(value)))
    throw new Error("Unsafe CLI argument");
  const command = ["npx", "--yes", "supabase@2.117.0", ...args];
  const result =
    process.platform === "win32"
      ? spawnSync("cmd.exe", ["/d", "/s", "/c", command.join(" ")], {
          cwd: root,
          encoding: "utf8",
          windowsHide: true,
        })
      : spawnSync(command[0], command.slice(1), {
          cwd: root,
          encoding: "utf8",
        });
  if (result.error) throw result.error;
  if (result.status !== 0)
    throw new Error(
      (result.stderr || result.stdout || "Supabase command failed").trim(),
    );
  return combined ? `${result.stdout}\n${result.stderr}` : result.stdout;
}
try {
  const projects = JSON.parse(cli(["projects", "list", "--output", "json"]));
  if (
    !Array.isArray(projects) ||
    !projects.some((item) => item.id === project || item.ref === project)
  )
    throw new Error("Account does not have access to the configured project");
  const secrets = JSON.parse(
    cli(["secrets", "list", "--project-ref", project, "--output", "json"]),
  );
  const secretNames = new Set(secrets.map((item) => item.name));
  const required = [
    "OPENAI_API_KEY",
    "ANAM_API_KEY",
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "RESEND_API_KEY",
    "TAVUS_API_KEY",
    "TAVUS_WEBHOOK_SECRET",
    "DEEPGRAM_API_KEY",
  ];
  const missing = required.filter((name) => !secretNames.has(name));
  console.log(
    `Secrets: ${missing.length ? `missing ${missing.join(", ")}` : "required names present (values not inspected)"}`,
  );
  const preview = cli(
    ["db", "push", "--project-ref", project, "--dry-run", "--skip-vault"],
    true,
  );
  console.log(preview);
  const pending = [
    ...preview.matchAll(/\b(\d{14}_[A-Za-z0-9_-]+\.sql)\b/g),
  ].map((match) => match[1]);
  const unexpected = pending.filter((name) => !allowedMigrations.has(name));
  if (unexpected.length)
    throw new Error(
      `Historical migrations need reconciliation before deployment: ${unexpected.join(", ")}`,
    );
  if (!pending.length && !/up to date|no.*migration|nothing to/i.test(preview))
    throw new Error(
      "Could not determine the pending migration list. Review it manually; no changes applied.",
    );
  if (!apply) {
    console.log(
      "Read-only plan complete. Configure Tavus tool callbacks as documented before --apply.",
    );
  } else {
    if (missing.length)
      throw new Error(
        "Required provider configuration is missing; no deployment applied.",
      );
    if (process.env.TAVUS_CALLBACK_CONFIGURED !== "1")
      throw new Error(
        "Configure the Tavus persona tool callback secret, then set TAVUS_CALLBACK_CONFIGURED=1. No deployment applied.",
      );
    // Verify local checks immediately before mutation; caller must also perform the documented SQL rehearsal.
    for (const args of [
      [
        "node_modules/vitest/vitest.mjs",
        "run",
        "--config",
        "scripts/vitest-backend.config.ts",
      ],
      [
        "node_modules/typescript/bin/tsc",
        "--noEmit",
        "-p",
        "tsconfig.app.json",
      ],
    ]) {
      const result = spawnSync(process.execPath, args, {
        cwd: root,
        stdio: "inherit",
        windowsHide: true,
      });
      if (result.status !== 0)
        throw new Error("Local checks failed; no deployment applied.");
    }
    console.log(
      cli(
        ["db", "push", "--project-ref", project, "--skip-vault", "--yes"],
        true,
      ),
    );
    console.log(
      cli(
        [
          "functions",
          "deploy",
          ...names,
          "--project-ref",
          project,
          "--use-api",
        ],
        true,
      ),
    );
    const deployed = JSON.parse(
      cli(["functions", "list", "--project-ref", project, "--output", "json"]),
    );
    const available = new Set(
      deployed
        .filter((item) => item.status === "ACTIVE")
        .map((item) => item.slug || item.name),
    );
    const absent = names.filter((name) => !available.has(name));
    if (absent.length)
      throw new Error(
        `Post-deployment function inventory incomplete: ${absent.join(", ")}`,
      );
    console.log(
      "All functions report ACTIVE. Authenticated live avatar/payment acceptance remains a separate check.",
    );
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
