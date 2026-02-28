// src/commands/fun/subcommands/slots/slotsStore.ts
// Persist slots stats (spins, wins, jackpots, biggest_win).

import { getDb } from "../../../../services/database/db.js";

function ensureSlotsTable(): void {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS slots_stats (
      user_id TEXT PRIMARY KEY,
      spins INTEGER NOT NULL DEFAULT 0,
      wins INTEGER NOT NULL DEFAULT 0,
      jackpots INTEGER NOT NULL DEFAULT 0,
      biggest_win TEXT,
      updated_at INTEGER NOT NULL
    );
  `);
}

export type SlotsStats = {
  spins: number;
  wins: number;
  jackpots: number;
  biggestWin: string | null;
  winRate: number;
};

export function getStats(userId: string): SlotsStats {
  ensureSlotsTable();
  const db = getDb();

  type Row = {
    spins: number;
    wins: number;
    jackpots: number;
    biggest_win: string | null;
  };
  const row = db
    .prepare(
      `SELECT spins, wins, jackpots, biggest_win FROM slots_stats WHERE user_id = ?`,
    )
    .get(userId) as Row | undefined;

  if (!row) return { spins: 0, wins: 0, jackpots: 0, biggestWin: null, winRate: 0 };

  return {
    spins: row.spins,
    wins: row.wins,
    jackpots: row.jackpots,
    biggestWin: row.biggest_win,
    winRate: row.spins > 0 ? Math.round((row.wins / row.spins) * 100) : 0,
  };
}

export function recordSpin(
  userId: string,
  isWin: boolean,
  isJackpot: boolean,
  payout: number,
): void {
  ensureSlotsTable();
  const db = getDb();
  const now = Date.now();

  const current = getStats(userId);
  const currentBiggest = current.biggestWin
    ? parseInt(current.biggestWin.replace("x", ""), 10)
    : 0;
  const newBiggest = payout > currentBiggest ? `${payout}x` : current.biggestWin;

  db.prepare(
    `INSERT INTO slots_stats (user_id, spins, wins, jackpots, biggest_win, updated_at)
     VALUES (?, 1, ?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET
       spins = spins + 1,
       wins = wins + ?,
       jackpots = jackpots + ?,
       biggest_win = ?,
       updated_at = ?`,
  ).run(
    userId,
    isWin ? 1 : 0,
    isJackpot ? 1 : 0,
    newBiggest,
    now,
    isWin ? 1 : 0,
    isJackpot ? 1 : 0,
    newBiggest,
    now,
  );
}

export function getLeaderboard(limit = 10): Array<{ user_id: string; jackpots: number }> {
  ensureSlotsTable();
  const db = getDb();

  return db
    .prepare(
      `SELECT user_id, jackpots FROM slots_stats 
       WHERE jackpots > 0 
       ORDER BY jackpots DESC 
       LIMIT ?`,
    )
    .all(limit) as Array<{ user_id: string; jackpots: number }>;
}
