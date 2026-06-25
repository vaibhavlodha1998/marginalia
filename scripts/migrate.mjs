import { readdirSync, readFileSync } from "node:fs";
import { Client } from "pg";

function loadEnv(file) {
  try {
    for (const line of readFileSync(file, "utf8").split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
    }
  } catch {
    // optional file
  }
}

loadEnv(".env.local");
loadEnv(".env");

const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!url) {
  console.error("DIRECT_URL / DATABASE_URL not set");
  process.exit(1);
}

const dir = "supabase/migrations";
const files = readdirSync(dir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

const client = new Client({
  connectionString: url,
  ssl: { rejectUnauthorized: false },
});
await client.connect();

// Ledger of applied migrations, so each runs once and re-runs are skipped.
await client.query(`create table if not exists public.schema_migrations (
  version text primary key,
  applied_at timestamptz not null default now()
)`);
const { rows } = await client.query("select version from public.schema_migrations");
const applied = new Set(rows.map((r) => r.version));

for (const file of files) {
  if (applied.has(file)) {
    console.log(`skip ${file} (applied)`);
    continue;
  }
  process.stdout.write(`applying ${file} ... `);
  try {
    await client.query("begin");
    await client.query(readFileSync(`${dir}/${file}`, "utf8"));
    await client.query("insert into public.schema_migrations(version) values ($1)", [file]);
    await client.query("commit");
    console.log("ok");
  } catch (e) {
    await client.query("rollback");
    if (/already exists|already a/i.test(e.message)) {
      // Object predates the ledger: record it so future runs skip it.
      await client.query(
        "insert into public.schema_migrations(version) values ($1) on conflict do nothing",
        [file],
      );
      console.log("already applied (recorded)");
    } else {
      console.log("FAILED:", e.message);
      await client.end();
      process.exit(1);
    }
  }
}

await client.end();
console.log("done");
