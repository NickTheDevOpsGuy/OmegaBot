#!/usr/bin/env node
/**
 * Database integrity check for OmegaBot SQLite database.
 * Run: npm run db:check
 * Or:  DATABASE_PATH=/path/to/omegabot.db npm run db:check
 */
import "dotenv/config";
import fs from "node:fs";
import Database from "better-sqlite3";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const raw = (process.env.DATABASE_PATH || "data/omegabot.db").trim();
const resolved =
  raw === ":memory:"
    ? raw
    : path.isAbsolute(raw)
      ? raw
      : path.resolve(__dirname, "..", raw);

console.log("Database path:", resolved);
if (resolved === ":memory:") {
  console.log("Skipping: in-memory DB has no file to check.");
  process.exit(0);
}

if (!fs.existsSync(resolved)) {
  console.error(
    "Database file not found. Run the bot first to create it, or set DATABASE_PATH.",
  );
  process.exit(1);
}

const db = new Database(resolved, { readonly: true });

// 1. Integrity check
const integrity = db.prepare("PRAGMA integrity_check").get() as {
  integrity_check: string;
};
console.log("Integrity:", integrity.integrity_check);
if (integrity.integrity_check !== "ok") {
  console.error("Database may be corrupted!");
  process.exit(1);
}

// 2. List tables and row counts
const tables = db
  .prepare(
    `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name`,
  )
  .all() as Array<{ name: string }>;

console.log("\nTables and row counts:");
for (const { name } of tables) {
  const count = db.prepare(`SELECT COUNT(*) as c FROM "${name}"`).get() as { c: number };
  console.log(`  ${name}: ${count.c} rows`);
}

// 3. Quick foreign key check (if enabled)
try {
  const fkCheck = db.prepare("PRAGMA foreign_key_check").all();
  if (fkCheck.length > 0) {
    console.warn("\nForeign key issues:", fkCheck);
  }
} catch {
  // FK check may not be enabled
}

db.close();
console.log("\nDatabase check complete.");
