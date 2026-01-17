// src/services/database/db.ts
import Database from "better-sqlite3";
import { env } from "../../config/env.js";
import { logger } from "../../utils/logger.js";
import fs from "fs";
import path from "path";

/**
 * Singleton database instance.
 */
let db: Database.Database | null = null;

/**
 * Initialize the SQLite database with all required tables.
 */
export function initDatabase(): Database.Database {
  if (db) return db;

  // Ensure data directory exists
  const dbDir = path.dirname(env.databasePath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  logger.info({ path: env.databasePath }, "Initializing database");

  db = new Database(env.databasePath);

  // Enable WAL mode for better concurrency
  db.pragma("journal_mode = WAL");

  // Create tables
  db.exec(`
    -- FAQs table
    CREATE TABLE IF NOT EXISTS faqs (
      key TEXT PRIMARY KEY,
      answer TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      usage_count INTEGER DEFAULT 0,
      created_by TEXT,
      updated_by TEXT
    );

    -- User timezones
    CREATE TABLE IF NOT EXISTS user_timezones (
      user_id TEXT PRIMARY KEY,
      timezone TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );

    -- Guild configuration
    CREATE TABLE IF NOT EXISTS guild_config (
      guild_id TEXT PRIMARY KEY,
      config TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );

    -- Fun command usage tracking
    CREATE TABLE IF NOT EXISTS fun_usage (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      command TEXT NOT NULL,
      timestamp INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_fun_usage_user ON fun_usage(user_id);
    CREATE INDEX IF NOT EXISTS idx_fun_usage_command ON fun_usage(command);

    -- Coin flip results
    CREATE TABLE IF NOT EXISTS coin_flips (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      result TEXT NOT NULL,
      timestamp INTEGER NOT NULL
    );

    -- Poll data
    CREATE TABLE IF NOT EXISTS polls (
      message_id TEXT PRIMARY KEY,
      poll_data TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      expires_at INTEGER
    );

    -- GitHub last seen tracking
    CREATE TABLE IF NOT EXISTS github_last_seen (
      repo_key TEXT PRIMARY KEY,
      last_seen_timestamp INTEGER NOT NULL,
      entity_type TEXT NOT NULL
    );

    -- OpenAI usage tracking for cost control
    CREATE TABLE IF NOT EXISTS openai_usage (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      model TEXT NOT NULL,
      prompt_tokens INTEGER NOT NULL,
      completion_tokens INTEGER NOT NULL,
      estimated_cost REAL NOT NULL,
      timestamp INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_openai_usage_user ON openai_usage(user_id);
    CREATE INDEX IF NOT EXISTS idx_openai_usage_timestamp ON openai_usage(timestamp);

    -- Claude API usage tracking for cost control
    CREATE TABLE IF NOT EXISTS claude_usage (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      model TEXT NOT NULL,
      input_tokens INTEGER NOT NULL,
      output_tokens INTEGER NOT NULL,
      estimated_cost REAL NOT NULL,
      timestamp INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_claude_usage_user ON claude_usage(user_id);
    CREATE INDEX IF NOT EXISTS idx_claude_usage_timestamp ON claude_usage(timestamp);
  `);

  logger.info("Database initialized successfully");

  return db;
}

/**
 * Get the database instance.
 * Throws if database hasn't been initialized.
 */
export function getDb(): Database.Database {
  if (!db) {
    throw new Error("Database not initialized. Call initDatabase() first.");
  }
  return db;
}

/**
 * Close the database connection.
 * Should be called during graceful shutdown.
 */
export function closeDatabase(): void {
  if (db) {
    logger.info("Closing database connection");
    db.close();
    db = null;
  }
}

/**
 * Helper to run queries in a transaction.
 */
export function transaction<T>(fn: (db: Database.Database) => T): T {
  const database = getDb();
  const txn = database.transaction(fn);
  return txn(database);
}
