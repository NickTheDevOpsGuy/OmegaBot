// src/services/analytics/commandUsageStore.ts
// Tracks command usage per user per day for non-game commands.

import { getDb } from "../database/db.js";

function ensureTable(): void {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS command_usage_daily (
      date TEXT NOT NULL,
      command TEXT NOT NULL,
      user_id TEXT NOT NULL,
      count INTEGER NOT NULL DEFAULT 1,
      PRIMARY KEY (date, command, user_id)
    );
    CREATE INDEX IF NOT EXISTS idx_command_usage_daily_date ON command_usage_daily(date);
  `);
}

function todayKey(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

const GAME_COMMANDS = new Set([
  "slots",
  "blackjack",
  "rps",
  "trivia",
  "hangman",
  "wordle",
  "connect4",
  "tictactoe",
  "dice",
  "coinflip",
  "darts",
]);

/**
 * Record command usage. Skips game commands (handled by game_usage_daily).
 */
export function recordCommandUsage(userId: string, command: string): void {
  if (GAME_COMMANDS.has(command)) return;
  ensureTable();
  const db = getDb();
  const date = todayKey();
  db.prepare(
    `INSERT INTO command_usage_daily (date, command, user_id, count)
     VALUES (?, ?, ?, 1)
     ON CONFLICT(date, command, user_id) DO UPDATE SET count = count + 1`,
  ).run(date, command, userId);
}
