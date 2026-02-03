// src/commands/fun/subcommands/rpsStore.ts
//
// Database operations for Rock-Paper-Scissors stats.
// Tracks solo (vs bot) and PvP head-to-head records.

import { getDb } from "../../../services/database/db.js";

/* -------------------------------------------------------------------------- */
/* Schema                                                                      */
/* -------------------------------------------------------------------------- */

export function ensureTables(): void {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS rps_stats (
      user_id TEXT PRIMARY KEY,
      wins INTEGER NOT NULL DEFAULT 0,
      losses INTEGER NOT NULL DEFAULT 0,
      ties INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS rps_h2h (
      user1_id TEXT NOT NULL,
      user2_id TEXT NOT NULL,
      user1_wins INTEGER NOT NULL DEFAULT 0,
      user2_wins INTEGER NOT NULL DEFAULT 0,
      ties INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (user1_id, user2_id)
    );

    CREATE TABLE IF NOT EXISTS rps_pvp_stats (
      user_id TEXT PRIMARY KEY,
      wins INTEGER NOT NULL DEFAULT 0,
      losses INTEGER NOT NULL DEFAULT 0,
      ties INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL
    );
  `);
}

/* -------------------------------------------------------------------------- */
/* Types                                                                       */
/* -------------------------------------------------------------------------- */

export type RpsStats = {
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

/* -------------------------------------------------------------------------- */
/* Solo Stats (vs bot)                                                         */
/* -------------------------------------------------------------------------- */

export type Result = "win" | "lose" | "tie";

export function recordSoloResult(userId: string, result: Result): void {
  ensureTables();
  const db = getDb();
  const now = Date.now();
  const column = result === "win" ? "wins" : result === "lose" ? "losses" : "ties";

  db.prepare(
    `
    INSERT INTO rps_stats (user_id, wins, losses, ties, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      ${column} = ${column} + 1,
      updated_at = ?
  `,
  ).run(
    userId,
    result === "win" ? 1 : 0,
    result === "lose" ? 1 : 0,
    result === "tie" ? 1 : 0,
    now,
    now,
  );
}

export function getSoloStats(userId: string): RpsStats {
  ensureTables();
  const db = getDb();

  type StatsRow = { wins: number; losses: number; ties: number };
  const row = db
    .prepare(`SELECT wins, losses, ties FROM rps_stats WHERE user_id = ?`)
    .get(userId) as StatsRow | undefined;

  if (!row) {
    return { wins: 0, losses: 0, ties: 0, total: 0, winRate: 0 };
  }

  const total = row.wins + row.losses + row.ties;
  const winRate = total > 0 ? Math.round((row.wins / total) * 100) : 0;

  return { wins: row.wins, losses: row.losses, ties: row.ties, total, winRate };
}

/* -------------------------------------------------------------------------- */
/* PvP Stats                                                                   */
/* -------------------------------------------------------------------------- */

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
      `
      INSERT INTO rps_pvp_stats (user_id, wins, losses, ties, updated_at)
      VALUES (?, 1, 0, 0, ?)
      ON CONFLICT(user_id) DO UPDATE SET wins = wins + 1, updated_at = ?
    `,
    ).run(winnerId, now, now);

    db.prepare(
      `
      INSERT INTO rps_pvp_stats (user_id, wins, losses, ties, updated_at)
      VALUES (?, 0, 1, 0, ?)
      ON CONFLICT(user_id) DO UPDATE SET losses = losses + 1, updated_at = ?
    `,
    ).run(loserId, now, now);
  } else {
    for (const id of [player1Id, player2Id]) {
      db.prepare(
        `
        INSERT INTO rps_pvp_stats (user_id, wins, losses, ties, updated_at)
        VALUES (?, 0, 0, 1, ?)
        ON CONFLICT(user_id) DO UPDATE SET ties = ties + 1, updated_at = ?
      `,
      ).run(id, now, now);
    }
  }

  const [id1, id2] = [player1Id, player2Id].sort();
  const isPlayer1Winner = winnerId === id1;
  const isPlayer2Winner = winnerId === id2;
  const isTie = !winnerId;

  db.prepare(
    `
    INSERT INTO rps_h2h (user1_id, user2_id, user1_wins, user2_wins, ties, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(user1_id, user2_id) DO UPDATE SET
      user1_wins = user1_wins + ?,
      user2_wins = user2_wins + ?,
      ties = ties + ?,
      updated_at = ?
  `,
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

export function getPvpStats(userId: string): RpsStats {
  ensureTables();
  const db = getDb();

  type StatsRow = { wins: number; losses: number; ties: number };
  const row = db
    .prepare(`SELECT wins, losses, ties FROM rps_pvp_stats WHERE user_id = ?`)
    .get(userId) as StatsRow | undefined;

  if (!row) {
    return { wins: 0, losses: 0, ties: 0, total: 0, winRate: 0 };
  }

  const total = row.wins + row.losses + row.ties;
  const winRate = total > 0 ? Math.round((row.wins / total) * 100) : 0;

  return { wins: row.wins, losses: row.losses, ties: row.ties, total, winRate };
}

export function getH2HStats(userId1: string, userId2: string): H2HStats {
  ensureTables();
  const db = getDb();

  const [id1, id2] = [userId1, userId2].sort();

  type H2HRow = { user1_wins: number; user2_wins: number; ties: number };
  const row = db
    .prepare(
      `SELECT user1_wins, user2_wins, ties FROM rps_h2h WHERE user1_id = ? AND user2_id = ?`,
    )
    .get(id1, id2) as H2HRow | undefined;

  if (!row) {
    return { user1Wins: 0, user2Wins: 0, ties: 0, total: 0 };
  }

  const user1Wins = userId1 === id1 ? row.user1_wins : row.user2_wins;
  const user2Wins = userId1 === id1 ? row.user2_wins : row.user1_wins;

  return {
    user1Wins,
    user2Wins,
    ties: row.ties,
    total: row.user1_wins + row.user2_wins + row.ties,
  };
}
