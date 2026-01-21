// src/services/fun/coinflipStore.ts
import { getDb } from "../../services/database/db";

export type CoinFlipResult = "heads" | "tails";

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

export function getCoinFlipTotals(userId: string): {
  heads: number;
  tails: number;
  total: number;
} {
  const db = getDb();

  const rows = db
    .prepare(
      `
      SELECT result, COUNT(*) as count
      FROM coin_flips
      WHERE user_id = ?
      GROUP BY result
      `,
    )
    .all(userId) as Array<{ result: CoinFlipResult; count: number }>;

  let heads = 0;
  let tails = 0;

  for (const r of rows) {
    if (r.result === "heads") heads = r.count;
    else tails = r.count;
  }

  return { heads, tails, total: heads + tails };
}

export function getRecentCoinFlips(
  userId: string,
  limit = 10,
): Array<{ result: CoinFlipResult; timestamp: number }> {
  const db = getDb();

  return db
    .prepare(
      `
      SELECT result, timestamp
      FROM coin_flips
      WHERE user_id = ?
      ORDER BY timestamp DESC
      LIMIT ?
      `,
    )
    .all(userId, limit) as Array<{ result: CoinFlipResult; timestamp: number }>;
}
