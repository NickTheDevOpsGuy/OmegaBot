// src/commands/fun/coinflipStore.ts

import type Database from "better-sqlite3";
import { getDb } from "../../../services/core/database/db.js";

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

export type CoinFlipLeaderboardRow = {
  userId: string;
  total: number;
  heads: number;
  tails: number;
};

export type CoinFlipStats = CoinFlipTotals & {
  recent: CoinFlipRecentRow[];
};

function ensureCoinFlipTable(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS coin_flips (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      result TEXT NOT NULL CHECK (result IN ('heads','tails')),
      timestamp INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_coin_flips_user ON coin_flips(user_id);
    CREATE INDEX IF NOT EXISTS idx_coin_flips_user_ts ON coin_flips(user_id, timestamp);
  `);
}

function withDb(): Database.Database {
  const db = getDb();
  ensureCoinFlipTable(db);
  return db;
}

export function recordCoinFlip(args: {
  userId: string;
  result: CoinFlipResult;
  timestamp?: number;
}): void {
  const db = withDb();
  const ts = args.timestamp ?? Date.now();

  db.prepare(
    `
    INSERT INTO coin_flips (user_id, result, timestamp)
    VALUES (?, ?, ?)
  `,
  ).run(args.userId, args.result, ts);
}

export function getCoinFlipTotals(userId: string): CoinFlipTotals {
  const db = withDb();

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
  const db = withDb();
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
    result: r.result === "heads" ? "heads" : "tails",
    timestamp: r.timestamp,
  }));
}

export function getCoinFlipLeaderboard(limit: number): CoinFlipLeaderboardRow[] {
  const db = withDb();
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

// Backwards compatible overloads
export function getCoinFlipStats(userId: string, limit?: number): CoinFlipStats;
export function getCoinFlipStats(args: { userId: string; limit?: number }): CoinFlipStats;
export function getCoinFlipStats(
  a: string | { userId: string; limit?: number },
  b?: number,
): CoinFlipStats {
  const userId = typeof a === "string" ? a : a.userId;
  const limit = typeof a === "string" ? (b ?? 10) : (a.limit ?? 10);

  const totals = getCoinFlipTotals(userId);
  const recent = getRecentCoinFlips(userId, limit);
  return { ...totals, recent };
}
