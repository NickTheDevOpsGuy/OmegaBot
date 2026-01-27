// src/commands/fun/subcommands/trivia.test.ts
//
// Tests for trivia game stats tracking.
//
// Coverage:
// - Correct/wrong answer tracking
// - Streak management
// - Best streak preservation

import { describe, expect, it, beforeEach } from "vitest";
import { useInMemoryDb } from "../../../test/dbTestUtils.js";
import { getDb } from "../../../services/database/db.js";

useInMemoryDb();

// Database setup
function ensureTriviaTable(): void {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS trivia_stats (
      user_id TEXT PRIMARY KEY,
      correct INTEGER NOT NULL DEFAULT 0,
      wrong INTEGER NOT NULL DEFAULT 0,
      streak INTEGER NOT NULL DEFAULT 0,
      best_streak INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL
    );
  `);
}

type TriviaStats = {
  correct: number;
  wrong: number;
  streak: number;
  bestStreak: number;
  accuracy: number;
};

function getStats(userId: string): TriviaStats {
  ensureTriviaTable();
  const db = getDb();

  const row = db
    .prepare(
      `SELECT correct, wrong, streak, best_streak FROM trivia_stats WHERE user_id = ?`,
    )
    .get(userId) as
    | { correct: number; wrong: number; streak: number; best_streak: number }
    | undefined;

  if (!row) {
    return { correct: 0, wrong: 0, streak: 0, bestStreak: 0, accuracy: 0 };
  }

  const total = row.correct + row.wrong;
  const accuracy = total > 0 ? Math.round((row.correct / total) * 100) : 0;

  return {
    correct: row.correct,
    wrong: row.wrong,
    streak: row.streak,
    bestStreak: row.best_streak,
    accuracy,
  };
}

function recordCorrect(userId: string): number {
  ensureTriviaTable();
  const db = getDb();
  const now = Date.now();

  const current = getStats(userId);
  const newStreak = current.streak + 1;

  db.prepare(
    `
    INSERT INTO trivia_stats (user_id, correct, wrong, streak, best_streak, updated_at)
    VALUES (?, 1, 0, 1, 1, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      correct = correct + 1,
      streak = streak + 1,
      best_streak = MAX(best_streak, streak + 1),
      updated_at = ?
  `,
  ).run(userId, now, now);

  return newStreak;
}

function recordWrong(userId: string): void {
  ensureTriviaTable();
  const db = getDb();
  const now = Date.now();

  db.prepare(
    `
    INSERT INTO trivia_stats (user_id, correct, wrong, streak, best_streak, updated_at)
    VALUES (?, 0, 1, 0, 0, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      wrong = wrong + 1,
      streak = 0,
      updated_at = ?
  `,
  ).run(userId, now, now);
}

describe("trivia game", () => {
  beforeEach(() => {
    ensureTriviaTable();
  });

  describe("stats tracking", () => {
    it("tracks correct answers", () => {
      recordCorrect("user1");
      recordCorrect("user1");
      recordCorrect("user1");

      const stats = getStats("user1");

      expect(stats.correct).toBe(3);
      expect(stats.wrong).toBe(0);
    });

    it("tracks wrong answers", () => {
      recordWrong("user1");
      recordWrong("user1");

      const stats = getStats("user1");

      expect(stats.wrong).toBe(2);
    });

    it("calculates accuracy", () => {
      recordCorrect("user1");
      recordCorrect("user1");
      recordCorrect("user1");
      recordWrong("user1");

      const stats = getStats("user1");

      expect(stats.accuracy).toBe(75); // 3/4 = 75%
    });

    it("returns zeros for unknown user", () => {
      const stats = getStats("unknown");

      expect(stats.correct).toBe(0);
      expect(stats.wrong).toBe(0);
      expect(stats.streak).toBe(0);
      expect(stats.accuracy).toBe(0);
    });
  });

  describe("streak tracking", () => {
    it("increments streak on correct", () => {
      recordCorrect("user1");
      expect(getStats("user1").streak).toBe(1);

      recordCorrect("user1");
      expect(getStats("user1").streak).toBe(2);

      recordCorrect("user1");
      expect(getStats("user1").streak).toBe(3);
    });

    it("resets streak on wrong", () => {
      recordCorrect("user1");
      recordCorrect("user1");
      recordCorrect("user1");
      recordWrong("user1");

      const stats = getStats("user1");

      expect(stats.streak).toBe(0);
    });

    it("preserves best streak", () => {
      // Build a 5 streak
      for (let i = 0; i < 5; i++) {
        recordCorrect("user1");
      }
      expect(getStats("user1").bestStreak).toBe(5);

      // Break streak
      recordWrong("user1");
      expect(getStats("user1").streak).toBe(0);
      expect(getStats("user1").bestStreak).toBe(5); // Still 5

      // Build smaller streak
      recordCorrect("user1");
      recordCorrect("user1");
      expect(getStats("user1").streak).toBe(2);
      expect(getStats("user1").bestStreak).toBe(5); // Still 5
    });

    it("updates best streak when exceeded", () => {
      recordCorrect("user1");
      recordCorrect("user1");
      recordWrong("user1");

      expect(getStats("user1").bestStreak).toBe(2);

      // Build longer streak
      for (let i = 0; i < 4; i++) {
        recordCorrect("user1");
      }

      expect(getStats("user1").bestStreak).toBe(4);
    });
  });
});
