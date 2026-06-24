import { readFileSync } from "node:fs";
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
const file = process.argv[2];
if (!url) {
  console.error("DIRECT_URL / DATABASE_URL not set");
  process.exit(1);
}
if (!file) {
  console.error("Usage: node scripts/db-apply.mjs <file.sql>");
  process.exit(1);
}

const client = new Client({
  connectionString: url,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  await client.query(readFileSync(file, "utf8"));
  await client.end();
  console.log("applied:", file);
} catch (e) {
  console.error("FAILED:", e.message);
  process.exit(1);
}
