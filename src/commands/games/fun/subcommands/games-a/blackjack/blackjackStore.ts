// src/commands/fun/subcommands/blackjackStore.ts
//
// Database operations for Blackjack stats.

import { getDb } from "../../../../../../services/core/database/db.js";

/* -------------------------------------------------------------------------- */
/* Schema                                                                      */
/* -------------------------------------------------------------------------- */

export function ensureBlackjackTable(): void {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS blackjack_stats (
      user_id TEXT PRIMARY KEY,
      wins INTEGER NOT NULL DEFAULT 0,
      losses INTEGER NOT NULL DEFAULT 0,
      ties INTEGER NOT NULL DEFAULT 0,
      blackjacks INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL
    );
  `);
}

/* -------------------------------------------------------------------------- */
/* Types                                                                       */
/* -------------------------------------------------------------------------- */

export type BlackjackStats = {
  wins: number;
  losses: number;
  ties: number;
  blackjacks: number;
  winRate: number;
};

/* -------------------------------------------------------------------------- */
/* Stats Operations                                                            */
/* -------------------------------------------------------------------------- */

export function getStats(userId: string): BlackjackStats {
  ensureBlackjackTable();
  const db = getDb();

  type Row = { wins: number; losses: number; ties: number; blackjacks: number };
  const row = db
    .prepare(
      `SELECT wins, losses, ties, blackjacks FROM blackjack_stats WHERE user_id = ?`,
    )
    .get(userId) as Row | undefined;

  if (!row) return { wins: 0, losses: 0, ties: 0, blackjacks: 0, winRate: 0 };

  const total = row.wins + row.losses + row.ties;
  return {
    ...row,
    winRate: total > 0 ? Math.round((row.wins / total) * 100) : 0,
  };
}

export function recordResult(
  userId: string,
  result: "win" | "loss" | "tie",
  isBlackjack = false,
): void {
  ensureBlackjackTable();
  const db = getDb();
  const now = Date.now();

  const winInc = result === "win" ? 1 : 0;
  const lossInc = result === "loss" ? 1 : 0;
  const tieInc = result === "tie" ? 1 : 0;
  const bjInc = isBlackjack ? 1 : 0;

  db.prepare(
    `INSERT INTO blackjack_stats (user_id, wins, losses, ties, blackjacks, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET
       wins = wins + ?,
       losses = losses + ?,
       ties = ties + ?,
       blackjacks = blackjacks + ?,
       updated_at = ?`,
  ).run(userId, winInc, lossInc, tieInc, bjInc, now, winInc, lossInc, tieInc, bjInc, now);
}
