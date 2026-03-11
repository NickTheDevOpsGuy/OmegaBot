// src/services/database/migrations.ts
// Versioned migrations - runs SQL files from migrations/ in order.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type Database from "better-sqlite3";
import { logger } from "../../../utils/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MIGRATIONS_DIR = path.resolve(__dirname, "../../../../migrations");

export function runMigrations(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS _schema_migrations (
      name TEXT PRIMARY KEY,
      applied_at INTEGER NOT NULL
    )
  `);

  type MigrationRow = { name: string };
  const rows = database
    .prepare("SELECT name FROM _schema_migrations")
    .all() as MigrationRow[];
  const applied = new Set(rows.map((r) => r.name));

  const files = fs.readdirSync(MIGRATIONS_DIR);
  const toRun = files.filter((f) => f.endsWith(".sql") && f !== "schema.sql").sort();

  for (const file of toRun) {
    const name = path.basename(file, ".sql");
    if (applied.has(name)) continue;

    const filePath = path.join(MIGRATIONS_DIR, file);
    const sql = fs.readFileSync(filePath, "utf-8");

    try {
      database.exec(sql);
      database
        .prepare("INSERT INTO _schema_migrations (name, applied_at) VALUES (?, ?)")
        .run(name, Date.now());
      logger.info({ migration: name }, "[db] migration applied");
    } catch (err) {
      logger.error({ err, migration: name }, "[db] migration failed");
      throw err;
    }
  }
}
