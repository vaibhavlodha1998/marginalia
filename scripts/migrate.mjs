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

for (const file of files) {
  process.stdout.write(`applying ${file} ... `);
  try {
    await client.query(readFileSync(`${dir}/${file}`, "utf8"));
    console.log("ok");
  } catch (e) {
    console.log("FAILED:", e.message);
  }
}

await client.end();
console.log("done");
