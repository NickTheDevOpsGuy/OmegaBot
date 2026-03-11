// src/services/fun/gameUsageMetrics.ts
//
// Lightweight daily game play metrics.
// Tracks command usage per user per day for analytics.

import { getDb } from "../../core/database/db.js";

export type GameCommand =
  | "slots"
  | "blackjack"
  | "rps"
  | "trivia"
  | "hangman"
  | "wordle"
  | "connect4"
  | "tictactoe"
  | "dice"
  | "coinflip"
  | "darts";

function ensureTable(): void {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS game_usage_daily (
      date TEXT NOT NULL,
      command TEXT NOT NULL,
      user_id TEXT NOT NULL,
      count INTEGER NOT NULL DEFAULT 1,
      PRIMARY KEY (date, command, user_id)
    );
    CREATE INDEX IF NOT EXISTS idx_game_usage_daily_date ON game_usage_daily(date);
  `);
}

function todayKey(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

/**
 * Record a game play for today's metrics.
 */
export function recordDailyPlay(userId: string, command: GameCommand): void {
  ensureTable();
  const db = getDb();
  const date = todayKey();

  db.prepare(
    `INSERT INTO game_usage_daily (date, command, user_id, count)
     VALUES (?, ?, ?, 1)
     ON CONFLICT(date, command, user_id) DO UPDATE SET count = count + 1`,
  ).run(date, command, userId);
}

/**
 * Get today's play count for a command (all users).
 */
export function getTodayCommandPlays(command: GameCommand): number {
  ensureTable();
  const db = getDb();
  const row = db
    .prepare(
      `SELECT SUM(count) as total FROM game_usage_daily WHERE date = ? AND command = ?`,
    )
    .get(todayKey(), command) as { total: number | null };
  return row?.total ?? 0;
}

/**
 * Get today's play count for a user (all commands).
 */
export function getTodayUserPlays(userId: string): number {
  ensureTable();
  const db = getDb();
  const row = db
    .prepare(
      `SELECT SUM(count) as total FROM game_usage_daily WHERE date = ? AND user_id = ?`,
    )
    .get(todayKey(), userId) as { total: number | null };
  return row?.total ?? 0;
}
