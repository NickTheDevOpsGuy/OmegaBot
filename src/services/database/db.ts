// src/services/database/db.ts
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { logger } from "../../utils/logger.js";

let db: Database.Database | null = null;

function resolveDatabasePath(): { raw: string; resolved: string } {
  const raw = (process.env.DATABASE_PATH || "data/omegabot.db").trim();

  // Support in-memory DB for tests (":memory:") without touching the filesystem.
  if (raw === ":memory:") return { raw, resolved: raw };

  // Make the default stable regardless of where node is executed from.
  // Resolve relative paths against the project root-ish location (src/services/database).
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  const resolved = path.isAbsolute(raw) ? raw : path.resolve(__dirname, "../../../", raw);

  return { raw, resolved };
}

export function initDatabase(): Database.Database {
  if (db) return db;

  const { raw, resolved } = resolveDatabasePath();
  const isMemory = resolved === ":memory:";

  if (!isMemory) {
    const dbDir = path.dirname(resolved);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
  }

  logger.info(
    {
      cwd: process.cwd(),
      databasePathRaw: raw,
      databasePathResolved: resolved,
    },
    "Initializing database",
  );

  db = new Database(resolved);

  // WAL is great for file-backed DBs; avoid it for ":memory:".
  if (!isMemory) {
    db.pragma("journal_mode = WAL");
  }

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

    /* -------------------------------------------------------------------- */
    /* Jokes                                                                 */
    /* -------------------------------------------------------------------- */
    CREATE TABLE IF NOT EXISTS jokes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      joke_text TEXT NOT NULL,
      category TEXT NOT NULL,
      added_by TEXT NOT NULL,
      added_at INTEGER NOT NULL,
      usage_count INTEGER DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_jokes_category ON jokes(category);

    /* -------------------------------------------------------------------- */
    /* Coin flips                                                            */
    /* -------------------------------------------------------------------- */
    CREATE TABLE IF NOT EXISTS coin_flips (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      result TEXT NOT NULL CHECK (result IN ('heads','tails')),
      timestamp INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_coin_flips_user ON coin_flips(user_id);
    CREATE INDEX IF NOT EXISTS idx_coin_flips_user_ts ON coin_flips(user_id, timestamp);

    /* -------------------------------------------------------------------- */
    /* GitHub last seen                                                      */
    /* -------------------------------------------------------------------- */
    CREATE TABLE IF NOT EXISTS github_last_seen (
      repo_key TEXT PRIMARY KEY,
      last_seen_timestamp INTEGER NOT NULL,
      entity_type TEXT NOT NULL
    );

    /* -------------------------------------------------------------------- */
    /* Reminders                                                             */
    /* -------------------------------------------------------------------- */
    CREATE TABLE IF NOT EXISTS reminders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      message TEXT NOT NULL,
      due_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      delivered_at INTEGER
    );

    CREATE INDEX IF NOT EXISTS idx_reminders_pending_due
      ON reminders(delivered_at, due_at);

    /* -------------------------------------------------------------------- */
    /* GitHub assignee tracking                                              */
    /* -------------------------------------------------------------------- */
    CREATE TABLE IF NOT EXISTS github_assignees_meta (
      owner TEXT NOT NULL,
      repo TEXT NOT NULL,
      initialized_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (owner, repo)
    );

    CREATE TABLE IF NOT EXISTS github_assignees_state (
      owner TEXT NOT NULL,
      repo TEXT NOT NULL,
      number INTEGER NOT NULL,
      kind TEXT NOT NULL,
      title TEXT NOT NULL,
      url TEXT NOT NULL,
      assignees_json TEXT,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (owner, repo, number)
    );

    CREATE INDEX IF NOT EXISTS idx_github_assignees_repo
      ON github_assignees_state(owner, repo);

    /* -------------------------------------------------------------------- */
    /* Rock Paper Scissors                                                    */
    /* -------------------------------------------------------------------- */
    CREATE TABLE IF NOT EXISTS rps_stats (
      user_id TEXT PRIMARY KEY,
      wins INTEGER NOT NULL DEFAULT 0,
      losses INTEGER NOT NULL DEFAULT 0,
      ties INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS rps_h2h (
      user1_id TEXT NOT NULL,
      user2_id TEXT NOT NULL,
      user1_wins INTEGER NOT NULL DEFAULT 0,
      user2_wins INTEGER NOT NULL DEFAULT 0,
      ties INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (user1_id, user2_id)
    );

    CREATE TABLE IF NOT EXISTS rps_pvp_stats (
      user_id TEXT PRIMARY KEY,
      wins INTEGER NOT NULL DEFAULT 0,
      losses INTEGER NOT NULL DEFAULT 0,
      ties INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL
    );

    /* -------------------------------------------------------------------- */
    /* Trivia                                                                 */
    /* -------------------------------------------------------------------- */
    CREATE TABLE IF NOT EXISTS trivia_stats (
      user_id TEXT PRIMARY KEY,
      correct INTEGER NOT NULL DEFAULT 0,
      incorrect INTEGER NOT NULL DEFAULT 0,
      points INTEGER NOT NULL DEFAULT 0,
      streak INTEGER NOT NULL DEFAULT 0,
      best_streak INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL
    );

    /* -------------------------------------------------------------------- */
    /* Quotes                                                                 */
    /* -------------------------------------------------------------------- */
    CREATE TABLE IF NOT EXISTS quotes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      author_id TEXT NOT NULL,
      quote_text TEXT NOT NULL,
      added_by TEXT NOT NULL,
      added_at INTEGER NOT NULL,
      context TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_quotes_guild ON quotes(guild_id);
    CREATE INDEX IF NOT EXISTS idx_quotes_author ON quotes(guild_id, author_id);

    /* -------------------------------------------------------------------- */
    /* Daily Check-ins                                                        */
    /* -------------------------------------------------------------------- */
    CREATE TABLE IF NOT EXISTS daily_checkins (
      user_id TEXT PRIMARY KEY,
      streak INTEGER NOT NULL DEFAULT 0,
      best_streak INTEGER NOT NULL DEFAULT 0,
      total_checkins INTEGER NOT NULL DEFAULT 0,
      points INTEGER NOT NULL DEFAULT 0,
      last_checkin INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    /* -------------------------------------------------------------------- */
    /* AFK Status                                                             */
    /* -------------------------------------------------------------------- */
    CREATE TABLE IF NOT EXISTS afk_status (
      user_id TEXT PRIMARY KEY,
      guild_id TEXT NOT NULL,
      message TEXT NOT NULL,
      set_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_afk_guild ON afk_status(guild_id);
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
