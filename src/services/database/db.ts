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

/**
 * Attempt to recover a corrupted database.
 * Returns true if recovery succeeded, false otherwise.
 */
function attemptDatabaseRecovery(dbPath: string): boolean {
  const backupPath = `${dbPath}.corrupted.${Date.now()}`;
  const recoveredPath = `${dbPath}.recovered`;

  try {
    logger.warn({ dbPath, backupPath }, "Attempting database recovery...");

    // Backup the corrupted file
    fs.copyFileSync(dbPath, backupPath);
    logger.info({ backupPath }, "Corrupted database backed up");

    // Try to recover using SQLite's .recover command via a new connection
    try {
      const corruptedDb = new Database(dbPath, { readonly: true });
      const recoveredDb = new Database(recoveredPath);

      // Get schema and data using pragma and manual copy
      const tables = corruptedDb
        .prepare(
          `SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`,
        )
        .all() as Array<{ name: string; sql: string }>;

      for (const table of tables) {
        try {
          // Create table in recovered db
          recoveredDb.exec(table.sql);

          // Copy data
          const rows = corruptedDb.prepare(`SELECT * FROM "${table.name}"`).all();
          if (rows.length > 0) {
            const columns = Object.keys(rows[0] as object);
            const placeholders = columns.map(() => "?").join(", ");
            const insert = recoveredDb.prepare(
              `INSERT INTO "${table.name}" (${columns.map((c) => `"${c}"`).join(", ")}) VALUES (${placeholders})`,
            );

            for (const row of rows) {
              try {
                insert.run(...columns.map((c) => (row as Record<string, unknown>)[c]));
              } catch {
                // Skip rows that fail
              }
            }
          }
          logger.info({ table: table.name, rows: rows.length }, "Recovered table");
        } catch (err) {
          logger.warn({ table: table.name, err }, "Failed to recover table");
        }
      }

      corruptedDb.close();
      recoveredDb.close();

      // Replace corrupted with recovered
      fs.unlinkSync(dbPath);
      fs.renameSync(recoveredPath, dbPath);

      logger.info("Database recovery completed successfully");
      return true;
    } catch (recoveryErr) {
      logger.error(
        { err: recoveryErr },
        "Recovery via copy failed, will create fresh database",
      );

      // Clean up partial recovery
      if (fs.existsSync(recoveredPath)) {
        fs.unlinkSync(recoveredPath);
      }

      // Delete corrupted file, will create fresh
      fs.unlinkSync(dbPath);
      return true; // Let it create a fresh database
    }
  } catch (err) {
    logger.error({ err }, "Database recovery failed completely");
    return false;
  }
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

  // Try to open the database, with corruption recovery
  let retryCount = 0;
  const maxRetries = 2;

  while (retryCount < maxRetries) {
    try {
      db = new Database(resolved);

      // Test the connection with a simple query
      db.prepare("SELECT 1").get();

      break; // Success!
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      const isCorruption =
        errorMessage.includes("SQLITE_CORRUPT") ||
        errorMessage.includes("database disk image is malformed") ||
        errorMessage.includes("file is not a database");

      if (isCorruption && !isMemory && retryCount === 0) {
        logger.error({ err }, "Database corruption detected, attempting recovery...");

        // Close the failed connection if it exists
        if (db) {
          try {
            db.close();
          } catch {
            // Ignore close errors
          }
          db = null;
        }

        const recovered = attemptDatabaseRecovery(resolved);
        if (recovered) {
          retryCount++;
          continue; // Try again with recovered/fresh database
        }
      }

      // Re-throw if not corruption or recovery failed
      throw err;
    }
  }

  if (!db) {
    throw new Error("Failed to initialize database after recovery attempts");
  }

  // WAL is great for file-backed DBs; avoid it for ":memory:".
  if (!isMemory) {
    db.pragma("journal_mode = WAL");
  }

  // Load and run base schema from migrations/schema.sql
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const schemaPath = path.resolve(__dirname, "../../../migrations/schema.sql");
  const schemaSql = fs.readFileSync(schemaPath, "utf-8");
  db.exec(schemaSql);

  // -------------------------------------------------------------------------
  // Migrations (keep init resilient across schema tweaks)
  // -------------------------------------------------------------------------
  function ensureCoinFlipsSchema(): void {
    try {
      const cols = db!.prepare("PRAGMA table_info(coin_flips)").all() as Array<{
        name: string;
      }>;
      const hasTimestamp = cols.some((c) => c.name === "timestamp");
      if (!hasTimestamp) {
        logger.warn("[db] migrating coin_flips: adding missing timestamp column");
        db!.exec(
          "ALTER TABLE coin_flips ADD COLUMN timestamp INTEGER NOT NULL DEFAULT 0;",
        );
      }
      db!.exec(
        "CREATE INDEX IF NOT EXISTS idx_coin_flips_user_ts ON coin_flips(user_id, timestamp);",
      );
    } catch (err) {
      // Never crash the bot on a best-effort migration.
      logger.error({ err }, "[db] coin_flips migration failed");
    }
  }

  ensureCoinFlipsSchema();

  function ensureHangmanStatsSchema(): void {
    try {
      const cols = db!.prepare("PRAGMA table_info(hangman_stats)").all() as Array<{
        name: string;
      }>;
      if (!cols.some((c) => c.name === "best_time_seconds")) {
        logger.warn("[db] migrating hangman_stats: adding best_time_seconds");
        db!.exec("ALTER TABLE hangman_stats ADD COLUMN best_time_seconds INTEGER;");
      }
      if (!cols.some((c) => c.name === "total_win_time_seconds")) {
        logger.warn("[db] migrating hangman_stats: adding total_win_time_seconds");
        db!.exec(
          "ALTER TABLE hangman_stats ADD COLUMN total_win_time_seconds INTEGER NOT NULL DEFAULT 0;",
        );
      }
    } catch (err) {
      logger.error({ err }, "[db] hangman_stats migration failed");
    }
  }
  ensureHangmanStatsSchema();

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
