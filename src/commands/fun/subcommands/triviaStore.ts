// src/commands/fun/subcommands/triviaStore.ts
//
// Database operations for Trivia stats.

import { getDb } from "../../../services/database/db.js";

/* -------------------------------------------------------------------------- */
/* Schema                                                                      */
/* -------------------------------------------------------------------------- */

export function ensureTriviaTable(): void {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS trivia_stats (
      user_id TEXT PRIMARY KEY,
      correct INTEGER NOT NULL DEFAULT 0,
      incorrect INTEGER NOT NULL DEFAULT 0,
      points INTEGER NOT NULL DEFAULT 0,
      streak INTEGER NOT NULL DEFAULT 0,
      best_streak INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL
    );
  `);
}

/* -------------------------------------------------------------------------- */
/* Types                                                                       */
/* -------------------------------------------------------------------------- */

export type TriviaStats = {
  correct: number;
  incorrect: number;
  points: number;
  streak: number;
  bestStreak: number;
  accuracy: number;
};

/* -------------------------------------------------------------------------- */
/* Stats Operations                                                            */
/* -------------------------------------------------------------------------- */

export function getStats(userId: string): TriviaStats {
  ensureTriviaTable();
  const db = getDb();

  type Row = {
    correct: number;
    incorrect: number;
    points: number;
    streak: number;
    best_streak: number;
  };

  const row = db
    .prepare(
      `SELECT correct, incorrect, points, streak, best_streak FROM trivia_stats WHERE user_id = ?`,
    )
    .get(userId) as Row | undefined;

  if (!row) {
    return { correct: 0, incorrect: 0, points: 0, streak: 0, bestStreak: 0, accuracy: 0 };
  }

  const total = row.correct + row.incorrect;
  const accuracy = total > 0 ? Math.round((row.correct / total) * 100) : 0;

  return {
    correct: row.correct,
    incorrect: row.incorrect,
    points: row.points,
    streak: row.streak,
    bestStreak: row.best_streak,
    accuracy,
  };
}

export function recordCorrect(userId: string, points: number): void {
  ensureTriviaTable();
  const db = getDb();
  const now = Date.now();

  db.prepare(
    `
    INSERT INTO trivia_stats (user_id, correct, incorrect, points, streak, best_streak, updated_at)
    VALUES (?, 1, 0, ?, 1, 1, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      correct = correct + 1,
      points = points + ?,
      streak = streak + 1,
      best_streak = MAX(best_streak, streak + 1),
      updated_at = ?
  `,
  ).run(userId, points, now, points, now);
}

export function recordIncorrect(userId: string): void {
  ensureTriviaTable();
  const db = getDb();
  const now = Date.now();

  db.prepare(
    `
    INSERT INTO trivia_stats (user_id, correct, incorrect, points, streak, best_streak, updated_at)
    VALUES (?, 0, 1, 0, 0, 0, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      incorrect = incorrect + 1,
      streak = 0,
      updated_at = ?
  `,
  ).run(userId, now, now);
}

export function getTriviaLeaderboard(
  limit: number,
): Array<{ userId: string; points: number; correct: number; bestStreak: number }> {
  ensureTriviaTable();
  const db = getDb();

  type Row = {
    user_id: string;
    points: number;
    correct: number;
    best_streak: number;
  };

  const rows = db
    .prepare(
      `SELECT user_id, points, correct, best_streak FROM trivia_stats ORDER BY points DESC LIMIT ?`,
    )
    .all(limit) as Row[];

  return rows.map((r) => ({
    userId: r.user_id,
    points: r.points,
    correct: r.correct,
    bestStreak: r.best_streak,
  }));
}
