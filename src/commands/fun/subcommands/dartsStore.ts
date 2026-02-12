// src/commands/fun/subcommands/dartsStore.ts
//
// Database operations for Darts stats.
// Tracks solo throws (best round, 180 count) and PvP head-to-head records.

import { getDb } from "../../../services/database/db.js";

/* -------------------------------------------------------------------------- */
/* Schema                                                                      */
/* -------------------------------------------------------------------------- */

export function ensureTables(): void {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS darts_stats (
      user_id TEXT PRIMARY KEY,
      throws INTEGER NOT NULL DEFAULT 0,
      best_round INTEGER NOT NULL DEFAULT 0,
      count_180 INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS darts_pvp_stats (
      user_id TEXT PRIMARY KEY,
      wins INTEGER NOT NULL DEFAULT 0,
      losses INTEGER NOT NULL DEFAULT 0,
      ties INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS darts_h2h (
      user1_id TEXT NOT NULL,
      user2_id TEXT NOT NULL,
      user1_wins INTEGER NOT NULL DEFAULT 0,
      user2_wins INTEGER NOT NULL DEFAULT 0,
      ties INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (user1_id, user2_id)
    );
  `);
}

/* -------------------------------------------------------------------------- */
/* Solo Stats                                                                  */
/* -------------------------------------------------------------------------- */

export type DartsStats = {
  throws: number;
  bestRound: number;
  count180: number;
};

export function getStats(userId: string): DartsStats {
  ensureTables();
  const db = getDb();

  type Row = { throws: number; best_round: number; count_180: number };
  const row = db
    .prepare(`SELECT throws, best_round, count_180 FROM darts_stats WHERE user_id = ?`)
    .get(userId) as Row | undefined;

  if (!row) return { throws: 0, bestRound: 0, count180: 0 };

  return {
    throws: row.throws,
    bestRound: row.best_round,
    count180: row.count_180,
  };
}

export function recordSoloThrow(userId: string, score: number, is180: boolean): void {
  ensureTables();
  const db = getDb();
  const now = Date.now();

  const current = getStats(userId);
  const newBest = Math.max(current.bestRound, score);

  db.prepare(
    `INSERT INTO darts_stats (user_id, throws, best_round, count_180, updated_at)
     VALUES (?, 1, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET
       throws = throws + 1,
       best_round = ?,
       count_180 = count_180 + ?,
       updated_at = ?`,
  ).run(
    userId,
    newBest,
    is180 ? 1 : 0,
    now,
    newBest,
    is180 ? 1 : 0,
    now,
  );
}

/* -------------------------------------------------------------------------- */
/* Leaderboards                                                                */
/* -------------------------------------------------------------------------- */

export function getBestRoundLeaderboard(limit = 10): Array<{
  user_id: string;
  best_round: number;
}> {
  ensureTables();
  const db = getDb();
  return db
    .prepare(
      `SELECT user_id, best_round FROM darts_stats
       WHERE best_round > 0
       ORDER BY best_round DESC
       LIMIT ?`,
    )
    .all(limit) as Array<{ user_id: string; best_round: number }>;
}

export function get180Leaderboard(limit = 10): Array<{
  user_id: string;
  count_180: number;
}> {
  ensureTables();
  const db = getDb();
  return db
    .prepare(
      `SELECT user_id, count_180 FROM darts_stats
       WHERE count_180 > 0
       ORDER BY count_180 DESC
       LIMIT ?`,
    )
    .all(limit) as Array<{ user_id: string; count_180: number }>;
}

export function getPvpWinsLeaderboard(limit = 10): Array<{
  user_id: string;
  wins: number;
}> {
  ensureTables();
  const db = getDb();
  return db
    .prepare(
      `SELECT user_id, wins FROM darts_pvp_stats
       WHERE wins > 0
       ORDER BY wins DESC
       LIMIT ?`,
    )
    .all(limit) as Array<{ user_id: string; wins: number }>;
}

/* -------------------------------------------------------------------------- */
/* PvP Stats                                                                   */
/* -------------------------------------------------------------------------- */

export type DartsPvpStats = {
  wins: number;
  losses: number;
  ties: number;
  total: number;
  winRate: number;
};

export type H2HStats = {
  user1Wins: number;
  user2Wins: number;
  ties: number;
  total: number;
};

export function recordPvpResult(
  winnerId: string | null,
  loserId: string | null,
  player1Id: string,
  player2Id: string,
): void {
  ensureTables();
  const db = getDb();
  const now = Date.now();

  if (winnerId && loserId) {
    db.prepare(
      `INSERT INTO darts_pvp_stats (user_id, wins, losses, ties, updated_at)
       VALUES (?, 1, 0, 0, ?)
       ON CONFLICT(user_id) DO UPDATE SET wins = wins + 1, updated_at = ?`,
    ).run(winnerId, now, now);

    db.prepare(
      `INSERT INTO darts_pvp_stats (user_id, wins, losses, ties, updated_at)
       VALUES (?, 0, 1, 0, ?)
       ON CONFLICT(user_id) DO UPDATE SET losses = losses + 1, updated_at = ?`,
    ).run(loserId, now, now);
  } else {
    for (const id of [player1Id, player2Id]) {
      db.prepare(
        `INSERT INTO darts_pvp_stats (user_id, wins, losses, ties, updated_at)
         VALUES (?, 0, 0, 1, ?)
         ON CONFLICT(user_id) DO UPDATE SET ties = ties + 1, updated_at = ?`,
      ).run(id, now, now);
    }
  }

  const [id1, id2] = [player1Id, player2Id].sort();
  const isPlayer1Winner = winnerId === id1;
  const isPlayer2Winner = winnerId === id2;
  const isTie = !winnerId;

  db.prepare(
    `INSERT INTO darts_h2h (user1_id, user2_id, user1_wins, user2_wins, ties, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(user1_id, user2_id) DO UPDATE SET
       user1_wins = user1_wins + ?,
       user2_wins = user2_wins + ?,
       ties = ties + ?,
       updated_at = ?`,
  ).run(
    id1,
    id2,
    isPlayer1Winner ? 1 : 0,
    isPlayer2Winner ? 1 : 0,
    isTie ? 1 : 0,
    now,
    isPlayer1Winner ? 1 : 0,
    isPlayer2Winner ? 1 : 0,
    isTie ? 1 : 0,
    now,
  );
}

export function getPvpStats(userId: string): DartsPvpStats {
  ensureTables();
  const db = getDb();

  type Row = { wins: number; losses: number; ties: number };
  const row = db
    .prepare(`SELECT wins, losses, ties FROM darts_pvp_stats WHERE user_id = ?`)
    .get(userId) as Row | undefined;

  if (!row) return { wins: 0, losses: 0, ties: 0, total: 0, winRate: 0 };

  const total = row.wins + row.losses + row.ties;
  const winRate = total > 0 ? Math.round((row.wins / total) * 100) : 0;

  return {
    wins: row.wins,
    losses: row.losses,
    ties: row.ties,
    total,
    winRate,
  };
}

export function getH2HStats(userId1: string, userId2: string): H2HStats {
  ensureTables();
  const db = getDb();

  const [id1, id2] = [userId1, userId2].sort();

  type H2HRow = { user1_wins: number; user2_wins: number; ties: number };
  const row = db
    .prepare(
      `SELECT user1_wins, user2_wins, ties FROM darts_h2h WHERE user1_id = ? AND user2_id = ?`,
    )
    .get(id1, id2) as H2HRow | undefined;

  if (!row) return { user1Wins: 0, user2Wins: 0, ties: 0, total: 0 };

  const user1Wins = userId1 === id1 ? row.user1_wins : row.user2_wins;
  const user2Wins = userId1 === id1 ? row.user2_wins : row.user1_wins;

  return {
    user1Wins,
    user2Wins,
    ties: row.ties,
    total: row.user1_wins + row.user2_wins + row.ties,
  };
}
