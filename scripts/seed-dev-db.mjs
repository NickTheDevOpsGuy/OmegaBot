#!/usr/bin/env node
/**
 * Seed the database with sample data for local development.
 * Usage: DATABASE_PATH=data/dev.db node scripts/seed-dev-db.mjs
 * Use :memory: for ephemeral testing.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const dbPath = process.env.DATABASE_PATH ?? path.join(projectRoot, "data", "dev.db");

const dataDir = path.dirname(dbPath);
if (dataDir !== "" && dbPath !== ":memory:") {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath);

const schemaPath = path.join(projectRoot, "migrations", "schema.sql");
const schema = fs.readFileSync(schemaPath, "utf-8");
db.exec(schema);

db.exec(`
  CREATE TABLE IF NOT EXISTS _schema_migrations (name TEXT PRIMARY KEY, applied_at INTEGER NOT NULL)
`);
const migrationsDir = path.join(projectRoot, "migrations");
const migrationFiles = fs.readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql") && f !== "schema.sql")
  .sort();

for (const file of migrationFiles) {
  const name = path.basename(file, ".sql");
  const existing = db.prepare("SELECT 1 FROM _schema_migrations WHERE name = ?").get(name);
  if (existing) continue;

  const sql = fs.readFileSync(path.join(migrationsDir, file), "utf-8");
  db.exec(sql);
  db.prepare("INSERT INTO _schema_migrations (name, applied_at) VALUES (?, ?)").run(name, Date.now());
}

const now = Math.floor(Date.now() / 1000);

const insertFaq = db.prepare(`
  INSERT OR IGNORE INTO faqs (key, title, body, tags, created_at, updated_at, usage_count, created_by, updated_by)
  VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)
`);
insertFaq.run("welcome", "Welcome!", "Welcome to the server!", "general,help", now, now, "system", "system");
insertFaq.run("rules", "Server Rules", "1. Be kind. 2. No spam.", "rules", now, now, "system", "system");

const insertTz = db.prepare(`
  INSERT OR REPLACE INTO user_timezones (user_id, timezone, updated_at) VALUES (?, ?, ?)
`);
insertTz.run("dev-user-123", "America/New_York", now);

console.log(`Seeded dev database at ${dbPath}`);
db.close();
