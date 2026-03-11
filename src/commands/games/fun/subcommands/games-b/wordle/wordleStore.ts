// src/commands/fun/subcommands/wordleStore.ts
//
// Database operations for Wordle stats and game progress.

import { getDb } from "../../../../../../services/core/database/db.js";

export const MAX_GUESSES = 6;
export const WORD_LENGTH = 5;

/* -------------------------------------------------------------------------- */
/* Schema                                                                      */
/* -------------------------------------------------------------------------- */

export function ensureWordleTables(): void {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS wordle_games (
      user_id TEXT NOT NULL,
      date TEXT NOT NULL,
      word TEXT NOT NULL,
      guesses TEXT NOT NULL,
      won INTEGER NOT NULL,
      completed_at INTEGER NOT NULL,
      PRIMARY KEY (user_id, date)
    );

    CREATE TABLE IF NOT EXISTS wordle_stats (
      user_id TEXT PRIMARY KEY,
      played INTEGER NOT NULL DEFAULT 0,
      won INTEGER NOT NULL DEFAULT 0,
      current_streak INTEGER NOT NULL DEFAULT 0,
      max_streak INTEGER NOT NULL DEFAULT 0,
      guess_distribution TEXT NOT NULL DEFAULT '{}',
      updated_at INTEGER NOT NULL
    );
  `);
}

/* -------------------------------------------------------------------------- */
/* Types                                                                       */
/* -------------------------------------------------------------------------- */

export type WordleStats = {
  played: number;
  won: number;
  currentStreak: number;
  maxStreak: number;
  winRate: number;
  guessDistribution: Record<string, number>;
};

/* -------------------------------------------------------------------------- */
/* Stats & Game Operations                                                     */
/* -------------------------------------------------------------------------- */

export function getStats(userId: string): WordleStats {
  ensureWordleTables();
  const db = getDb();

  type Row = {
    played: number;
    won: number;
    current_streak: number;
    max_streak: number;
    guess_distribution: string;
  };

  const row = db
    .prepare(
      `SELECT played, won, current_streak, max_streak, guess_distribution FROM wordle_stats WHERE user_id = ?`,
    )
    .get(userId) as Row | undefined;

  if (!row) {
    return {
      played: 0,
      won: 0,
      currentStreak: 0,
      maxStreak: 0,
      winRate: 0,
      guessDistribution: {},
    };
  }

  return {
    played: row.played,
    won: row.won,
    currentStreak: row.current_streak,
    maxStreak: row.max_streak,
    winRate: row.played > 0 ? Math.round((row.won / row.played) * 100) : 0,
    guessDistribution: JSON.parse(row.guess_distribution || "{}"),
  };
}

export function getTodayDate(): string {
  return new Date().toISOString().split("T")[0];
}

export function getTodayGame(userId: string): { guesses: string[]; won: boolean } | null {
  ensureWordleTables();
  const db = getDb();
  const today = getTodayDate();

  type Row = { guesses: string; won: number };
  const row = db
    .prepare(`SELECT guesses, won FROM wordle_games WHERE user_id = ? AND date = ?`)
    .get(userId, today) as Row | undefined;

  if (!row) return null;

  return {
    guesses: JSON.parse(row.guesses),
    won: row.won === 1,
  };
}

export function saveGame(
  userId: string,
  guesses: string[],
  won: boolean,
  todayWord: string,
): void {
  ensureWordleTables();
  const db = getDb();
  const now = Date.now();
  const today = getTodayDate();

  db.prepare(
    `INSERT OR REPLACE INTO wordle_games (user_id, date, word, guesses, won, completed_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(userId, today, todayWord, JSON.stringify(guesses), won ? 1 : 0, now);

  const stats = getStats(userId);
  const newStreak = won ? stats.currentStreak + 1 : 0;
  const newMaxStreak = Math.max(stats.maxStreak, newStreak);

  const dist = stats.guessDistribution;
  if (won) {
    const key = String(guesses.length);
    dist[key] = (dist[key] || 0) + 1;
  }

  db.prepare(
    `INSERT INTO wordle_stats (user_id, played, won, current_streak, max_streak, guess_distribution, updated_at)
     VALUES (?, 1, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET
       played = played + 1,
       won = won + ?,
       current_streak = ?,
       max_streak = ?,
       guess_distribution = ?,
       updated_at = ?`,
  ).run(
    userId,
    won ? 1 : 0,
    newStreak,
    newMaxStreak,
    JSON.stringify(dist),
    now,
    won ? 1 : 0,
    newStreak,
    newMaxStreak,
    JSON.stringify(dist),
    now,
  );
}
