// src/commands/fun/coinflipStore.ts
import { getDb } from "../../services/database/db.js";

export type CoinFlipResult = "heads" | "tails";

export type CoinFlipRow = {
  id: number;
  user_id: string;
  result: CoinFlipResult;
  created_at: number;
};

function db() {
  return getDb();
}

export function ensureCoinFlipTable(): void {
  // Append-only event table: one row per flip
  db().exec(`
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

export function recordCoinFlip(input: {
  userId: string;
  result: CoinFlipResult;
}): number {
  ensureCoinFlipTable();

  const stmt = db().prepare(`
    INSERT INTO coin_flips (user_id, result, created_at)
    VALUES (?, ?, ?)
  `);

  const info = stmt.run(input.userId, input.result, Date.now());
  return Number(info.lastInsertRowid);
}

export function getCoinFlipStats(input: { userId: string; limit?: number }): {
  total: number;
  heads: number;
  tails: number;
  recent: CoinFlipResult[];
} {
  ensureCoinFlipTable();

  const limit = Math.max(1, Math.min(20, input.limit ?? 5));

  const row = db()
    .prepare(
      `
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN result = 'heads' THEN 1 ELSE 0 END) AS heads,
        SUM(CASE WHEN result = 'tails' THEN 1 ELSE 0 END) AS tails
      FROM coin_flips
      WHERE user_id = ?
    `,
    )
    .get(input.userId) as { total: number; heads: number | null; tails: number | null };

  const recentRows = db()
    .prepare(
      `
      SELECT result
      FROM coin_flips
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `,
    )
    .all(input.userId, limit) as Array<{ result: CoinFlipResult }>;

  return {
    total: Number(row?.total ?? 0),
    heads: Number(row?.heads ?? 0),
    tails: Number(row?.tails ?? 0),
    recent: recentRows.map((r) => r.result),
  };
}
