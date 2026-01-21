// src/commands/fun/coinflipStore.ts
import { getDb } from "../../../services/database/db.js";

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

export function recordCoinFlip(args: {
  userId: string;
  result: CoinFlipResult;
  timestamp?: number;
}): void {
  const db = getDb();
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
    .get(userId) as
    | { total: number; heads: number | null; tails: number | null }
    | undefined;

  if (!row) return { total: 0, heads: 0, tails: 0 };

  return {
    total: row.total ?? 0,
    heads: row.heads ?? 0,
    tails: row.tails ?? 0,
  };
}

export function getRecentCoinFlips(userId: string, limit: number): CoinFlipRecentRow[] {
  const db = getDb();
  const lim = Math.min(Math.max(limit, 1), 25);

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
    .all(userId, lim) as Array<{ result: "heads" | "tails"; timestamp: number }>;

  return rows.map((r) => ({ result: r.result, timestamp: r.timestamp }));
}

export function getCoinFlipLeaderboard(limit: number): CoinFlipLeaderboardRow[] {
  const db = getDb();
  const lim = Math.min(Math.max(limit, 1), 25);

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
    .all(lim) as Array<{
    userId: string;
    total: number;
    heads: number | null;
    tails: number | null;
  }>;

  return rows.map((r) => ({
    userId: r.userId,
    total: r.total ?? 0,
    heads: r.heads ?? 0,
    tails: r.tails ?? 0,
  }));
}
