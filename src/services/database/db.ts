// src/services/database/db.ts
import Database from "better-sqlite3";
import { logger } from "../../utils/logger.js";
import fs from "fs";
import path from "path";

let db: Database.Database | null = null;

export function initDatabase(): Database.Database {
  if (db) return db;

  const databasePath = process.env.DATABASE_PATH || "data/omegabot.db";
  const dbDir = path.dirname(databasePath);

  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  logger.info({ path: databasePath }, "Initializing database");
  db = new Database(databasePath);
  db.pragma("journal_mode = WAL");

  db.exec(`
    CREATE TABLE IF NOT EXISTS faqs (
      key TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      tags TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      usage_count INTEGER DEFAULT 0,
      created_by TEXT,
      updated_by TEXT
    );

    CREATE TABLE IF NOT EXISTS user_timezones (
      user_id TEXT PRIMARY KEY,
      timezone TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS guild_config (
      guild_id TEXT PRIMARY KEY,
      config TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS fun_usage (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      command TEXT NOT NULL,
      timestamp INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_fun_usage_user ON fun_usage(user_id);
    CREATE INDEX IF NOT EXISTS idx_fun_usage_command ON fun_usage(command);

    CREATE TABLE IF NOT EXISTS github_last_seen (
      repo_key TEXT PRIMARY KEY,
      last_seen_timestamp INTEGER NOT NULL,
      entity_type TEXT NOT NULL
    );
  `);

  logger.info("Database tables created");
  return db;
}

export function getDb(): Database.Database {
  if (!db) {
    throw new Error("Database not initialized. Call initDatabase() first.");
  }
  return db;
}

export function closeDatabase(): void {
  if (db) {
    logger.info("Closing database");
    db.close();
    db = null;
  }
}

export function transaction<T>(fn: (db: Database.Database) => T): T {
  const database = getDb();
  const txn = database.transaction(fn);
  return txn(database);
}
