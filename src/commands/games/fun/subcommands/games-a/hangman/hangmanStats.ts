// src/commands/fun/subcommands/hangman/hangmanStats.ts
// Hangman stats (wins, losses, solve times) stored in SQLite.

import { getDb } from "../../../../../../services/core/database/db.js";

function ensureHangmanTable(): void {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS hangman_stats (
      user_id TEXT PRIMARY KEY,
      wins INTEGER NOT NULL DEFAULT 0,
      losses INTEGER NOT NULL DEFAULT 0,
      total_guesses INTEGER NOT NULL DEFAULT 0,
      best_time_seconds INTEGER,
      total_win_time_seconds INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL
    );
  `);
}

export type HangmanStats = {
  wins: number;
  losses: number;
  totalGuesses: number;
  winRate: number;
  bestTimeSeconds: number | null;
  averageTimeSeconds: number | null;
};

export function getStats(userId: string): HangmanStats {
  ensureHangmanTable();
  const db = getDb();

  type Row = {
    wins: number;
    losses: number;
    total_guesses: number;
    best_time_seconds: number | null;
    total_win_time_seconds: number;
  };
  const row = db
    .prepare(
      `SELECT wins, losses, total_guesses, best_time_seconds, total_win_time_seconds FROM hangman_stats WHERE user_id = ?`,
    )
    .get(userId) as Row | undefined;

  if (!row)
    return {
      wins: 0,
      losses: 0,
      totalGuesses: 0,
      winRate: 0,
      bestTimeSeconds: null,
      averageTimeSeconds: null,
    };

  const total = row.wins + row.losses;
  const avg =
    row.wins > 0 && row.total_win_time_seconds > 0
      ? Math.round(row.total_win_time_seconds / row.wins)
      : null;
  return {
    wins: row.wins,
    losses: row.losses,
    totalGuesses: row.total_guesses,
    winRate: total > 0 ? Math.round((row.wins / total) * 100) : 0,
    bestTimeSeconds: row.best_time_seconds ?? null,
    averageTimeSeconds: avg,
  };
}

export function recordResult(
  userId: string,
  won: boolean,
  guesses: number,
  solveTimeSeconds?: number,
): void {
  ensureHangmanTable();
  const db = getDb();
  const now = Date.now();

  if (won && solveTimeSeconds != null && solveTimeSeconds >= 0) {
    db.prepare(
      `INSERT INTO hangman_stats (user_id, wins, losses, total_guesses, best_time_seconds, total_win_time_seconds, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         wins = wins + 1,
         total_guesses = total_guesses + ?,
         best_time_seconds = MIN(COALESCE(best_time_seconds, 999999), ?),
         total_win_time_seconds = total_win_time_seconds + ?,
         updated_at = ?`,
    ).run(
      userId,
      1,
      0,
      guesses,
      solveTimeSeconds,
      solveTimeSeconds,
      now,
      guesses,
      solveTimeSeconds,
      solveTimeSeconds,
      now,
    );
  } else {
    db.prepare(
      `INSERT INTO hangman_stats (user_id, wins, losses, total_guesses, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         wins = wins + ?,
         losses = losses + ?,
         total_guesses = total_guesses + ?,
         updated_at = ?`,
    ).run(
      userId,
      won ? 1 : 0,
      won ? 0 : 1,
      guesses,
      now,
      won ? 1 : 0,
      won ? 0 : 1,
      guesses,
      now,
    );
  }
}
