// src/commands/fun/subcommands/tictactoeStore.ts
//
// Database operations for Tic-Tac-Toe stats.
// Tracks wins/losses/ties per user and head-to-head records.

import { getDb } from "../../../services/database/db.js";

/* -------------------------------------------------------------------------- */
/* Schema                                                                      */
/* -------------------------------------------------------------------------- */

export function ensureTttTable(): void {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS ttt_stats (
      user_id TEXT PRIMARY KEY,
      wins INTEGER NOT NULL DEFAULT 0,
      losses INTEGER NOT NULL DEFAULT 0,
      ties INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ttt_h2h (
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
/* Types                                                                       */
/* -------------------------------------------------------------------------- */

export type TttStats = {
  wins: number;
  losses: number;
  ties: number;
  total: number;
  winRate: number;
};

export type H2HStats = {
  yourWins: number;
  theirWins: number;
  ties: number;
};

/* -------------------------------------------------------------------------- */
/* Stats Operations                                                            */
/* -------------------------------------------------------------------------- */

export function getStats(userId: string): TttStats {
  ensureTttTable();
  const db = getDb();

  type Row = { wins: number; losses: number; ties: number };

  const row = db
    .prepare(`SELECT wins, losses, ties FROM ttt_stats WHERE user_id = ?`)
    .get(userId) as Row | undefined;

  if (!row) {
    return { wins: 0, losses: 0, ties: 0, total: 0, winRate: 0 };
  }

  const total = row.wins + row.losses + row.ties;
  const winRate = total > 0 ? Math.round((row.wins / total) * 100) : 0;

  return { ...row, total, winRate };
}

export function recordWin(winnerId: string, loserId: string): void {
  ensureTttTable();
  const db = getDb();
  const now = Date.now();

  // Update winner stats
  db.prepare(
    `
    INSERT INTO ttt_stats (user_id, wins, losses, ties, updated_at)
    VALUES (?, 1, 0, 0, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      wins = wins + 1,
      updated_at = ?
  `,
  ).run(winnerId, now, now);

  // Update loser stats
  db.prepare(
    `
    INSERT INTO ttt_stats (user_id, wins, losses, ties, updated_at)
    VALUES (?, 0, 1, 0, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      losses = losses + 1,
      updated_at = ?
  `,
  ).run(loserId, now, now);
}

export function recordTie(user1Id: string, user2Id: string): void {
  ensureTttTable();
  const db = getDb();
  const now = Date.now();

  db.prepare(
    `
    INSERT INTO ttt_stats (user_id, wins, losses, ties, updated_at)
    VALUES (?, 0, 0, 1, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      ties = ties + 1,
      updated_at = ?
  `,
  ).run(user1Id, now, now);

  db.prepare(
    `
    INSERT INTO ttt_stats (user_id, wins, losses, ties, updated_at)
    VALUES (?, 0, 0, 1, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      ties = ties + 1,
      updated_at = ?
  `,
  ).run(user2Id, now, now);
}

/* -------------------------------------------------------------------------- */
/* Head-to-Head                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Get head-to-head record between two players.
 * Always orders user IDs consistently for database key.
 */
export function getH2H(userId: string, opponentId: string): H2HStats {
  ensureTttTable();
  const db = getDb();

  // Always order IDs consistently
  const [id1, id2] = [userId, opponentId].sort();
  const isUser1 = id1 === userId;

  type Row = { user1_wins: number; user2_wins: number; ties: number };

  const row = db
    .prepare(
      `SELECT user1_wins, user2_wins, ties FROM ttt_h2h WHERE user1_id = ? AND user2_id = ?`,
    )
    .get(id1, id2) as Row | undefined;

  if (!row) {
    return { yourWins: 0, theirWins: 0, ties: 0 };
  }

  return {
    yourWins: isUser1 ? row.user1_wins : row.user2_wins,
    theirWins: isUser1 ? row.user2_wins : row.user1_wins,
    ties: row.ties,
  };
}

export function recordH2HWin(winnerId: string, loserId: string): void {
  ensureTttTable();
  const db = getDb();
  const now = Date.now();

  const [id1, id2] = [winnerId, loserId].sort();
  const winnerIsUser1 = id1 === winnerId;

  db.prepare(
    `
    INSERT INTO ttt_h2h (user1_id, user2_id, user1_wins, user2_wins, ties, updated_at)
    VALUES (?, ?, ?, ?, 0, ?)
    ON CONFLICT(user1_id, user2_id) DO UPDATE SET
      user1_wins = user1_wins + ?,
      user2_wins = user2_wins + ?,
      updated_at = ?
  `,
  ).run(
    id1,
    id2,
    winnerIsUser1 ? 1 : 0,
    winnerIsUser1 ? 0 : 1,
    now,
    winnerIsUser1 ? 1 : 0,
    winnerIsUser1 ? 0 : 1,
    now,
  );
}

export function recordH2HTie(user1Id: string, user2Id: string): void {
  ensureTttTable();
  const db = getDb();
  const now = Date.now();

  const [id1, id2] = [user1Id, user2Id].sort();

  db.prepare(
    `
    INSERT INTO ttt_h2h (user1_id, user2_id, user1_wins, user2_wins, ties, updated_at)
    VALUES (?, ?, 0, 0, 1, ?)
    ON CONFLICT(user1_id, user2_id) DO UPDATE SET
      ties = ties + 1,
      updated_at = ?
  `,
  ).run(id1, id2, now, now);
}

/**
 * Record a game result (win or tie). Updates both overall stats and head-to-head.
 */
export function recordResult(
  winnerId: string | null,
  loserId: string | null,
  player1Id: string,
  player2Id: string,
): void {
  if (winnerId && loserId) {
    recordWin(winnerId, loserId);
    recordH2HWin(winnerId, loserId);
  } else {
    recordTie(player1Id, player2Id);
    recordH2HTie(player1Id, player2Id);
  }
}

/**
 * Get head-to-head stats for display (user1's wins, user2's wins, ties, total).
 */
export function getH2HStats(
  userId1: string,
  userId2: string,
): {
  user1Wins: number;
  user2Wins: number;
  ties: number;
  total: number;
} {
  const h2h = getH2H(userId1, userId2);
  return {
    user1Wins: h2h.yourWins,
    user2Wins: h2h.theirWins,
    ties: h2h.ties,
    total: h2h.yourWins + h2h.theirWins + h2h.ties,
  };
}
