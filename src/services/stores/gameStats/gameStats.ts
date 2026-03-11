// src/services/gameStats/gameStats.ts
//
// Shared game stats queries for profile, achievements, and leaderboards.
// Centralizes table names and query patterns to avoid duplication.

import type { getDb } from "../../core/database/db.js";

type Db = ReturnType<typeof getDb>;

const WIN_TABLES = [
  "rps_stats",
  "ttt_stats",
  "blackjack_stats",
  "hangman_stats",
  "connect4_stats",
  "darts_pvp_stats",
] as const;

const GAME_COUNT_TABLES = [
  { table: "rps_stats", cols: ["wins", "losses", "ties"] },
  { table: "ttt_stats", cols: ["wins", "losses", "ties"] },
  { table: "blackjack_stats", cols: ["wins", "losses", "ties"] },
  { table: "hangman_stats", cols: ["wins", "losses"] },
  { table: "connect4_stats", cols: ["wins", "losses", "ties"] },
  { table: "darts_pvp_stats", cols: ["wins", "losses", "ties"] },
] as const;

/**
 * Sum wins across all game stat tables.
 */
export function getTotalWins(db: Db, userId: string): number {
  let total = 0;
  for (const table of WIN_TABLES) {
    try {
      const row = db
        .prepare(`SELECT wins FROM ${table} WHERE user_id = ?`)
        .get(userId) as { wins: number } | undefined;
      if (row?.wins) total += row.wins;
    } catch {
      /* table might not exist */
    }
  }
  return total;
}

/**
 * Sum games played (wins + losses + ties) across all game stat tables.
 */
export function getTotalGamesPlayed(db: Db, userId: string): number {
  let total = 0;
  for (const { table, cols } of GAME_COUNT_TABLES) {
    try {
      const sumCols = cols.join(" + ");
      const row = db
        .prepare(`SELECT (${sumCols}) as total FROM ${table} WHERE user_id = ?`)
        .get(userId) as { total: number } | undefined;
      if (row?.total) total += row.total;
    } catch {
      /* table might not exist */
    }
  }
  return total;
}

/**
 * Get a single numeric column from a table for a user.
 */
export function getScalar(db: Db, userId: string, table: string, column: string): number {
  try {
    const row = db
      .prepare(`SELECT ${column} FROM ${table} WHERE user_id = ?`)
      .get(userId) as Record<string, number> | undefined;
    return row?.[column] ?? 0;
  } catch {
    return 0;
  }
}

/**
 * Get a count from a table where column = value.
 */
export function getCount(db: Db, table: string, column: string, value: string): number {
  try {
    const row = db
      .prepare(`SELECT COUNT(*) as count FROM ${table} WHERE ${column} = ?`)
      .get(value) as { count: number };
    return row?.count ?? 0;
  } catch {
    return 0;
  }
}
