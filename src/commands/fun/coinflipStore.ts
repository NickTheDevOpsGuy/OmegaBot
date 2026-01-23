// src/commands/fun/coinflipStore.ts
import type Database from "better-sqlite3";
import { getDb } from "../../services/database/db.js";

export type CoinFlipResult = "heads" | "tails";

export type CoinFlipTotals = {
  total: number;
  heads: number;
  tails: number;
};

export type CoinFlipRecentRow = {
  result: CoinFlipResult;
  timestamp: number;
};

export type CoinFlipStats = CoinFlipTotals & {
  recent: CoinFlipRecentRow[];
};

export type CoinFlipLeaderboardRow = {
  userId: string;
  total: number;
  heads: number;
  tails: number;
};

/**
 * Ensure coin_flips exists and is compatible with current code.
 *
 * This protects you from schema drift when you add columns later.
 */
function ensureCoinFlipTable(db: Database.Database): void {
  // 1) Create table if missing
  db.exec(`
    CREATE TABLE IF NOT EXISTS coin_flips (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      result TEXT NOT NULL CHECK (result IN ('heads','tails')),
      timestamp INTEGER NOT NULL
    );
  `);

  // 2) If table existed from an older version, it may be missing `timestamp`.
  // Use PRAGMA to detect columns.
  type ColRow = { name: string };
  const cols = db.prepare(`PRAGMA table_info(coin_flips)`).all() as ColRow[];

  const colNames = new Set(cols.map((c) => c.name));

  if (!colNames.has("timestamp")) {
    // Add column with a default so existing rows become valid.
    // (SQLite requires DEFAULT for NOT NULL when adding a column.)
    db.exec(`ALTER TABLE coin_flips ADD COLUMN timestamp INTEGER NOT NULL DEFAULT 0;`);

    // Backfill reasonable values for old rows (0 is fine, but nicer to set to "now")
    // Only update rows that are still 0.
    db.prepare(`UPDATE coin_flips SET timestamp = ? WHERE timestamp = 0`).run(Date.now());
  }

  // 3) Indexes (safe to run repeatedly)
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_coin_flips_user ON coin_flips(user_id);
    CREATE INDEX IF NOT EXISTS idx_coin_flips_user_ts ON coin_flips(user_id, timestamp);
  `);
}

function normalizeResult(r: string): CoinFlipResult {
  return r === "heads" ? "heads" : "tails";
}

export function recordCoinFlip(args: {
  userId: string;
  result: CoinFlipResult;
  timestamp?: number;
}): void {
  const db = getDb();
  ensureCoinFlipTable(db);

  const ts = args.timestamp ?? Date.now();

  db.prepare(
    `
    INSERT INTO coin_flips (user_id, result, timestamp)
    VALUES (?, ?, ?)
  `,
  ).run(args.userId, args.result, ts);
}

export function getCoinFlipTotals(userId: string): CoinFlipTotals {
  const db = getDb();
  ensureCoinFlipTable(db);

  type TotalsRow = {
    total: number;
    heads: number | null;
    tails: number | null;
  };

  const row = db
    .prepare(
      `
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN result = 'heads' THEN 1 ELSE 0 END) as heads,
        SUM(CASE WHEN result = 'tails' THEN 1 ELSE 0 END) as tails
      FROM coin_flips
      WHERE user_id = ?
    `,
    )
    .get(userId) as TotalsRow | undefined;

  if (!row) return { total: 0, heads: 0, tails: 0 };

  return {
    total: row.total ?? 0,
    heads: row.heads ?? 0,
    tails: row.tails ?? 0,
  };
}

export function getRecentCoinFlips(userId: string, limit: number): CoinFlipRecentRow[] {
  const db = getDb();
  ensureCoinFlipTable(db);

  const lim = Math.min(Math.max(limit, 1), 25);

  type RecentRow = {
    result: string;
    timestamp: number;
  };

  const rows = db
    .prepare(
      `
      SELECT result, timestamp
      FROM coin_flips
      WHERE user_id = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `,
    )
    .all(userId, lim) as RecentRow[];

  return rows.map((r) => ({
    result: normalizeResult(r.result),
    timestamp: Number(r.timestamp ?? 0),
  }));
}

/**
 * Single helper coinflipstats should use.
 */
export function getCoinFlipStats(args: { userId: string; limit: number }): CoinFlipStats {
  const totals = getCoinFlipTotals(args.userId);
  const recent = getRecentCoinFlips(args.userId, args.limit);
  return { ...totals, recent };
}

export function getCoinFlipLeaderboard(limit: number): CoinFlipLeaderboardRow[] {
  const db = getDb();
  ensureCoinFlipTable(db);

  const lim = Math.min(Math.max(limit, 1), 25);

  type LeaderRow = {
    userId: string;
    total: number;
    heads: number | null;
    tails: number | null;
  };

  const rows = db
    .prepare(
      `
      SELECT
        user_id as userId,
        COUNT(*) as total,
        SUM(CASE WHEN result = 'heads' THEN 1 ELSE 0 END) as heads,
        SUM(CASE WHEN result = 'tails' THEN 1 ELSE 0 END) as tails
      FROM coin_flips
      GROUP BY user_id
      ORDER BY total DESC
      LIMIT ?
    `,
    )
    .all(lim) as LeaderRow[];

  return rows.map((r) => ({
    userId: String(r.userId),
    total: r.total ?? 0,
    heads: r.heads ?? 0,
    tails: r.tails ?? 0,
  }));
}
