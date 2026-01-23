// src/commands/fun/coinflipStore.ts
import { getDb } from "../../services/database/db.js";

export type CoinFlipResult = "heads" | "tails";

export type CoinFlipTotals = {
  total: number;
  heads: number;
  tails: number;
};

export type CoinFlipRecentRow = {
  result: CoinFlipResult;
  created_at: number;
};

export type CoinFlipLeaderboardRow = {
  userId: string;
  total: number;
  heads: number;
  tails: number;
};

export type CoinFlipStats = CoinFlipTotals & {
  recent: CoinFlipResult[];
};

/* -------------------------------------------------------------------------- */
/* Table guard                                                                 */
/* -------------------------------------------------------------------------- */

function ensureCoinFlipTable(): void {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS coin_flips (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      result TEXT NOT NULL CHECK (result IN ('heads','tails')),
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_coin_flips_user_created
      ON coin_flips(user_id, created_at DESC);
  `);
}

/* -------------------------------------------------------------------------- */
/* Writes                                                                      */
/* -------------------------------------------------------------------------- */

export function recordCoinFlip(args: {
  userId: string;
  result: CoinFlipResult;
  createdAt?: number;
}): void {
  ensureCoinFlipTable();

  const db = getDb();
  const ts = args.createdAt ?? Date.now();

  db.prepare(
    `
    INSERT INTO coin_flips (user_id, result, created_at)
    VALUES (?, ?, ?)
  `,
  ).run(args.userId, args.result, ts);
}

/* -------------------------------------------------------------------------- */
/* Reads                                                                       */
/* -------------------------------------------------------------------------- */

export function getCoinFlipTotals(userId: string): CoinFlipTotals {
  ensureCoinFlipTable();
  const db = getDb();

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
  ensureCoinFlipTable();
  const db = getDb();
  const lim = Math.min(Math.max(limit, 1), 25);

  type RecentRow = {
    result: string;
    created_at: number;
  };

  const rows = db
    .prepare(
      `
      SELECT result, created_at
      FROM coin_flips
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `,
    )
    .all(userId, lim) as RecentRow[];

  return rows.map((r) => ({
    result: r.result === "heads" ? "heads" : "tails",
    created_at: r.created_at,
  }));
}

/**
 * Convenience helper used by /fun coinflipstats
 */
export function getCoinFlipStats(userId: string, recentLimit = 5): CoinFlipStats {
  const totals = getCoinFlipTotals(userId);
  const recent = getRecentCoinFlips(userId, recentLimit).map((r) => r.result);

  return {
    ...totals,
    recent,
  };
}

/* -------------------------------------------------------------------------- */
/* Leaderboard                                                                */
/* -------------------------------------------------------------------------- */

export function getCoinFlipLeaderboard(limit: number): CoinFlipLeaderboardRow[] {
  ensureCoinFlipTable();
  const db = getDb();
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
    userId: r.userId,
    total: r.total ?? 0,
    heads: r.heads ?? 0,
    tails: r.tails ?? 0,
  }));
}
